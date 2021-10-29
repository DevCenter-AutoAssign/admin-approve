/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Probot} app
 */
 module.exports = (app) => {
  const handlePullRequest = require('./lib/admin-approve')

  app.on([
    'pull_request.opened',
    'pull_request.reopened',
    'pull_request_review.submitted',
  ], handlePullRequest)
}
