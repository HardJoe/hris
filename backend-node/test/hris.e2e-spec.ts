import { INestApplication } from '@nestjs/common';
import * as argon2 from 'argon2';
import { rm } from 'fs/promises';
import request from 'supertest';
import { appDataSource } from '../src/database/data-source';
import { createApp } from '../src/main';
import { User } from '../src/users/entities/user.entity';

const adminEmail = 'admin@example.com';
const adminPassword = 'correct-horse-battery-staple';

describe('HRIS API (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    await appDataSource.initialize();
    await appDataSource.runMigrations();
    await appDataSource.query('TRUNCATE TABLE employee_competencies, employees, competencies, users RESTART IDENTITY CASCADE');
    app = await createApp();
    await app.init();
    const passwordHash = await argon2.hash(adminPassword);
    await appDataSource.getRepository(User).save({ email: adminEmail, passwordHash, isActive: true });
    token = await login(app);
  });

  beforeEach(async () => {
    await appDataSource.query('TRUNCATE TABLE employee_competencies, employees, competencies RESTART IDENTITY CASCADE');
  });

  afterAll(async () => {
    await app.close();
    await appDataSource.destroy();
    await rm('/tmp/hris-e2e-uploads', { recursive: true, force: true });
  });

  it('reports liveness and rejects protected resources without a token', async () => {
    await request(app.getHttpServer()).get('/api/v1/health/live').expect(200).expect({ data: { status: 'ok' } });
    await request(app.getHttpServer()).get('/api/v1/health/ready').expect(200).expect({ data: { status: 'ready' } });
    await request(app.getHttpServer())
      .options('/api/v1/employees/employee/competencies/competency')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'PUT')
      .expect('Access-Control-Allow-Methods', /PUT/)
      .expect(204);
    await request(app.getHttpServer())
      .get('/api/v1/employees')
      .expect(401)
      .expect((response) => expect(response.body.error.statusCode).toBe(401));
  });

  it('authenticates an administrator and rejects invalid credentials', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: 'wrong-password' })
      .expect(401)
      .expect((response) => expect(response.body.error.message).toBe('Invalid email or password'));

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);
    expect(response.body.data).toMatchObject({ tokenType: 'Bearer', expiresIn: '1h' });
    expect(response.body.data.accessToken).toEqual(expect.any(String));
  });

  it('creates competencies and maps duplicate database errors to the API contract', async () => {
    const competency = await request(app.getHttpServer())
      .post('/api/v1/competencies')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'ReactJS' })
      .expect(201);
    expect(competency.body.data).toMatchObject({ name: 'ReactJS' });

    await request(app.getHttpServer())
      .post('/api/v1/competencies')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'reactjs' })
      .expect(409)
      .expect((response) => expect(response.body.error.code).toBe('DUPLICATE_RESOURCE'));
  });

  it('validates request DTOs and supports competency read, update, delete, search, and pagination', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/competencies')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'ReactJS', unexpected: true })
      .expect(400)
      .expect((response) => expect(response.body.error.message).toContain('property unexpected should not exist'));
    const node = await createCompetency(app, token, 'Node.js');
    await createCompetency(app, token, 'ReactJS');
    const list = await request(app.getHttpServer())
      .get('/api/v1/competencies')
      .set('Authorization', `Bearer ${token}`)
      .query({ search: 'node', page: 1, limit: 1 })
      .expect(200);
    expect(list.body.data).toMatchObject({ items: [expect.objectContaining({ id: node.id })], meta: { totalItems: 1 } });
    await request(app.getHttpServer())
      .get(`/api/v1/competencies/${node.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((response) => expect(response.body.data.name).toBe('Node.js'));
    await request(app.getHttpServer())
      .patch(`/api/v1/competencies/${node.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Node.js Runtime' })
      .expect(200)
      .expect((response) => expect(response.body.data.name).toBe('Node.js Runtime'));
    await request(app.getHttpServer())
      .delete(`/api/v1/competencies/${node.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);
    await request(app.getHttpServer())
      .get(`/api/v1/competencies/${node.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('runs the authenticated employee, competency, certificate, and dashboard workflow', async () => {
    const competency = await request(app.getHttpServer())
      .post('/api/v1/competencies')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'ReactJS' })
      .expect(201);
    const competencyId = competency.body.data.id as string;
    const employee = await request(app.getHttpServer())
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Ayu Pratama', gender: 'FEMALE', dateOfBirth: '1995-08-17', email: 'ayu@example.com',
        position: 'JUNIOR_PROGRAMMER', hiredAt: today(), competencies: [{ competencyId, grade: 'A' }],
      })
      .expect(201);
    const employeeId = employee.body.data.id as string;
    expect(employee.body.data.competencies).toEqual([expect.objectContaining({ id: competencyId, grade: 'A' })]);

    await request(app.getHttpServer())
      .post(`/api/v1/employees/${employeeId}/competencies/${competencyId}/certificate`)
      .set('Authorization', `Bearer ${token}`)
      .attach('certificate', Buffer.from('not a valid document'), 'invalid.pdf')
      .expect(400);
    await request(app.getHttpServer())
      .post(`/api/v1/employees/${employeeId}/competencies/${competencyId}/certificate`)
      .set('Authorization', `Bearer ${token}`)
      .attach('certificate', Buffer.from('%PDF-1.7\ncertificate'), 'certificate.pdf')
      .expect(201)
      .expect((response) => expect(response.body.data.competencies[0].certificate.available).toBe(true));
    await request(app.getHttpServer())
      .get('/api/v1/employees')
      .set('Authorization', `Bearer ${token}`)
      .query({ search: 'Ayu', competencyId })
      .expect(200)
      .expect((response) => expect(response.body.data.meta.totalItems).toBe(1));
    await request(app.getHttpServer())
      .get(`/api/v1/employees/${employeeId}/competencies/${competencyId}/certificate`)
      .set('Authorization', `Bearer ${token}`)
      .expect('Content-Type', /application\/pdf/)
      .expect('Content-Disposition', /attachment; filename\*=UTF-8''certificate.pdf/)
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/dashboard/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((response) => expect(response.body.data).toMatchObject({ totalEmployees: 1, newEmployees: { lastOneMonth: 1 } }));
  });

  it('updates employee assignments, soft-deletes the employee, and refreshes dashboard counts', async () => {
    const react = await createCompetency(app, token, 'ReactJS');
    const node = await createCompetency(app, token, 'Node.js');
    const employee = await createEmployee(app, token, react.id);

    await request(app.getHttpServer())
      .put(`/api/v1/employees/${employee.id}/competencies/${node.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ grade: 'B' })
      .expect(200)
      .expect((response) => expect(response.body.data.competencies).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: node.id, grade: 'B' }),
      ])));
    await request(app.getHttpServer())
      .patch(`/api/v1/employees/${employee.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Ayu Updated', position: 'SENIOR_PROGRAMMER' })
      .expect(200)
      .expect((response) => expect(response.body.data).toMatchObject({ name: 'Ayu Updated', position: 'SENIOR_PROGRAMMER' }));
    await request(app.getHttpServer())
      .delete(`/api/v1/employees/${employee.id}/competencies/${react.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);
    await request(app.getHttpServer())
      .delete(`/api/v1/employees/${employee.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);
    await request(app.getHttpServer())
      .get(`/api/v1/employees/${employee.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
    await request(app.getHttpServer())
      .get('/api/v1/dashboard/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((response) => expect(response.body.data.totalEmployees).toBe(0));
  });
});

async function login(app: INestApplication): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: adminEmail, password: adminPassword })
    .expect(200);
  return response.body.data.accessToken as string;
}

async function createCompetency(
  app: INestApplication,
  token: string,
  name: string,
): Promise<{ id: string; name: string }> {
  const response = await request(app.getHttpServer())
    .post('/api/v1/competencies')
    .set('Authorization', `Bearer ${token}`)
    .send({ name })
    .expect(201);
  return response.body.data as { id: string; name: string };
}

async function createEmployee(
  app: INestApplication,
  token: string,
  competencyId: string,
): Promise<{ id: string }> {
  const response = await request(app.getHttpServer())
    .post('/api/v1/employees')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Ayu Pratama', gender: 'FEMALE', dateOfBirth: '1995-08-17', email: 'ayu@example.com',
      position: 'JUNIOR_PROGRAMMER', hiredAt: today(), competencies: [{ competencyId, grade: 'A' }],
    })
    .expect(201);
  return response.body.data as { id: string };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
