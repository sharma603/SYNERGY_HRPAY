// Utility functions for common operations
const formatDate = (date) => {
  return new Date(date).toISOString();
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const calculateNetSalary = (baseSalary, bonus, deductions) => {
  return baseSalary + bonus - deductions;
};

const getDateRange = (startDate, endDate) => {
  return {
    start: new Date(startDate),
    end: new Date(endDate)
  };
};

module.exports = {
  formatDate,
  validateEmail,
  calculateNetSalary,
  getDateRange
};
