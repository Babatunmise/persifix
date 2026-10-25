library(WHORiskCalculator)

print("--- MI COEFFICIENTS ---")
print(WHORiskCalculator:::.get_nonlab_coef(outcome = "mi"))

print("--- STROKE COEFFICIENTS ---")
print(WHORiskCalculator:::.get_nonlab_coef(outcome = "stroke"))

print("--- MI INCIDENCE ---")
print(WHORiskCalculator:::.get_incidence_data(outcome = "mi"))

print("--- STROKE INCIDENCE ---")
print(WHORiskCalculator:::.get_incidence_data(outcome = "stroke"))