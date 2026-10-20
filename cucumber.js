module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: ['tests/features/step_definitions/**/*.ts', 'tests/features/support/**/*.ts'],
    paths: ['tests/features/**/*.feature'],
    format: ['progress', 'html:tests/reports/cucumber-report.html'],
    formatOptions: { snippetInterface: 'async-await' },
    publishQuiet: true,
  },
};
