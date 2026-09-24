package com.compnet.hris.employee;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

public class EmployeeCompetencyId implements Serializable {
    private UUID employee;
    private UUID competency;
    public EmployeeCompetencyId() {}
    public EmployeeCompetencyId(UUID employee, UUID competency) { this.employee = employee; this.competency = competency; }
    @Override public boolean equals(Object value) {
        return value instanceof EmployeeCompetencyId other
                && Objects.equals(employee, other.employee) && Objects.equals(competency, other.competency);
    }
    @Override public int hashCode() { return Objects.hash(employee, competency); }
}
