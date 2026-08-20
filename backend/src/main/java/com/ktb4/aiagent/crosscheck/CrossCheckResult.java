package com.ktb4.aiagent.crosscheck;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
public record CrossCheckResult(
	@JsonProperty("contract_employee_name") String contractEmployeeName,
	@JsonProperty("payslip_employee_name") String payslipEmployeeName,
	@JsonProperty("pay_period") String payPeriod,
	List<CrossCheckFinding> findings) { }
