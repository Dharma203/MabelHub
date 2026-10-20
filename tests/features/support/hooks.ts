import { Before, After } from '@cucumber/cucumber';
import { CustomWorld } from './world';

Before(function (this: CustomWorld) {
  // Reset state before each scenario
  this.requestBody = {};
  this.requestHeaders = {};
  this.sessionCookie = '';
  this.authToken = '';
  this.createdUserId = '';
  this.createdTeamId = '';
  this.createdRequestId = '';
});

After(function (this: CustomWorld) {
  // Cleanup after each scenario if needed
  // Note: For data cleanup, consider using tagged hooks
  // e.g., @cleanup-user to delete test users after scenario
});
