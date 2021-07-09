
const {Context, Probot, ProbotOctokit } = require("probot");
const myProbotApp = require("..");
const fs = require("fs");
const path = require("path");
const privateKey = fs.readFileSync(
    path.join(__dirname, "fixtures/mock-cert.pem"),
    "utf-8"
);
const payload = require('./fixtures/pull_request.opened.json')
const createCheck = require('./fixtures/create-check.json')
const updateCheck = require('./fixtures/update-check.json')
const listReviews = require('./fixtures/list-reviews.json')
const listTeams = require('./fixtures/list-teams.json')
const teamMembers = require('./fixtures/team-members.json')
const handlePullRequestChange  = require("../lib/admin-approve");
const getTeam = require("../lib/admin-approve")

describe('probot-autoAssign-reviewer', () => {
    let probot
    let octokit
    let context
  
    beforeEach(() => {
        probot = new Probot({
            appId: 123,
            privateKey,
            
            Octokit: ProbotOctokit.defaults({
              retry: { enabled: false },
              throttle: { enabled: false },
            }),
        });
          
        myProbotApp(probot);
        context = new Context(payload, {}, {})
        context.octokit.pulls = {
          listReviews: jest.fn().mockImplementation(() => Promise.resolve({
            data: listReviews,
          }))
        }

        context.octokit.checks = {
          create: jest.fn().mockImplementation(() => Promise.resolve({
            data: createCheck
          })),
          update: jest.fn().mockImplementation(() => Promise.resolve({
            data: updateCheck
          }))
        }

        context.octokit.repos = {
          listTeams: jest.fn().mockImplementation(() => Promise.resolve({
            data: listTeams
          })),

        }

        context.octokit.teams = {
          listMembersInOrg: jest.fn().mockImplementation(() => Promise.resolve({
            data: teamMembers
          }))
        }
        
        // Passes the mocked out GitHub API into out robot instance
        probot.auth = () => Promise.resolve(octokit)
       
    })

    describe("handle PR", () => {
      
      test("create check", async () => {
        await handlePullRequestChange(context)
        expect(context.octokit.checks.create).toHaveBeenCalled()
      })

      test("list reviews", async () => {
        await handlePullRequestChange(context)
        expect(context.octokit.pulls.listReviews).toHaveBeenCalled()
      })

      test("get teams", async () => {
        await handlePullRequestChange(context)
        expect(context.octokit.repos.listTeams).toHaveBeenCalled()
      })

      test("no teams", async () => {
        context.octokit.repos = {
            listTeams: jest.fn().mockImplementation(() => Promise.resolve({
                data: []
            }))
        }
        
        await getTeam(context)
        expect(context.octokit.repos.listTeams).toHaveBeenCalled()
      })

      test("get admin", async () => {
        const team = 'justice-league'
        await handlePullRequestChange(context,team)
        expect(context.octokit.teams.listMembersInOrg).toHaveBeenCalled()
      })

      test("no admin", async () => {
        const team = 'justice-league'
        context.octokit.teams = {
          listMembersInOrg: jest.fn().mockImplementation(() => Promise.resolve({
            data: []
          }))
        }
        await handlePullRequestChange(context,team)
        expect(context.octokit.teams.listMembersInOrg).toHaveBeenCalled()
      })

      test("update check run", async () => {
        
        const check_id = createCheck.id;
        
        await handlePullRequestChange(context)
        expect(context.octokit.checks.update).toHaveBeenCalled()
        expect(context.octokit.checks.update).toHaveBeenCalledWith({
          'owner': 'robotland',
          'repo': 'test',
          'check_run_id': check_id,
          'status':'completed',
          'conclusion':'success'
        })
      })

      
    })

    

    
})