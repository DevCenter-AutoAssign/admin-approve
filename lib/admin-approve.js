/**
 * The functions creates the inital check, gets IDs of user who has approved the PR 
 * and finally update the check. 
 * @param context The payload passed by the triggering event. 
 * @returns Updates the check with success message if approved by admin.
 */
async function handlePullRequestChange (context) {

  try{
    const owner = context.payload.repository.owner.login
    const orgName = context.payload.organization.login
    const repoName = context.payload.repository.name
    const checkRun = await createCheckRun(context, orgName, repoName)
    const approvedIDs = await getReviews(context, owner, repoName)
    const approveCount = approvedIDs.length
    
    var approval = false;
    if(approveCount > 0){
      approval = await getApprovalState(context, owner, orgName, repoName)
    }
    
    if(approval){
      
      const params = {
        owner: orgName,
        repo: repoName,
        check_run_id: checkRun.data.id,
        status: 'completed',
        conclusion: 'success'
      }
      return context.octokit.checks.update(params)
    } 
  }catch(err){
    console.log(err);
  }  
}

/**
 * 
 * @param context The payload passed by the triggering event.
 * @param orgName Organization name
 * @param repoName Repository name
 * @returns Creates the check and return the payload.
 */
async function createCheckRun(context, orgName, repoName){
  const params = {
    owner: orgName,
    repo: repoName,
    head_sha: context.payload.pull_request.head.sha,
    status: 'in_progress',
    output: {
      title: 'Get admin approval',
      summary: 'Pending admin approval'
    },
    name: 'Admin Approval'
  }

  return context.octokit.checks.create(params)
}

/**
 * 
 * @param context The payload passed by the triggering event.
 * @param owner userid of the user
 * @param repoName Repository name
 * @returns array of UserIDs who approved the PR.
 */
async function getReviews (context, owner, repoName) {
  const approvedIDs = [];
  const response = await context.octokit.pulls.listReviews({
    owner: owner,
    repo: repoName,
    pull_number: context.payload.pull_request.number
  })

  response.data.forEach(element => {
    if(element.state === 'APPROVED'){
      approvedIDs.push(element.user.login)
    }
  });
  
  return approvedIDs;
}

/**
 * 
 * @param context The payload passed by the triggering event.
 * @param owner userid of the user
 * @param orgName Organization name
 * @param repoName Repository name
 * @returns if the approvedIDs array has the id of the admin then it returns true else false
 */
async function getApprovalState(context, owner, orgName, repoName){
  
  const team = await getTeam(context, orgName, repoName);
  const adminIDs = await getAdmin(context, team, orgName);
  var flag = 0;
  
  const approvedIDs = await getReviews(context, owner, repoName)

  adminIDs.forEach( id => {
    if(approvedIDs.includes(id)){
      flag = 1;
    }  
  })

  if(flag === 1)
    return true
  else
    return false
}

/**
 * 
 * @param context The payload passed by the triggering event.
 * @param orgName Organization name
 * @param repoName Repository name 
 * @returns the team name associated with the repo
 */
async function getTeam (context, orgName, repoName){
  var team_name;
  
  const response = await context.octokit.repos.listTeams({
    owner: orgName,
    repo: repoName
  });
  if(Object(response.data).length > 0){
    response.data.forEach(item => {
      team_name = item.slug
    });
    
    return team_name;
  }else{
    throw "No team found!"
  }
  
}

/**
 * 
 * @param context The payload passed by the triggering event.
 * @param team Team name which was return in the getTeam()
 * @param orgName Organization name
 * @returns 
 */
async function getAdmin(context, team, orgName){
  var adminIDs = [];
  
  const response = await context.octokit.teams.listMembersInOrg({
      org: orgName,
      team_slug: team,
      role: 'maintainer'
  });
  if(Object(response.data).length > 0){
    response.data.forEach(item => {
        // admin = item.login;
        adminIDs.push(item.login)
    })
    return adminIDs;
  }else{
    throw "No admin in the team!"
  }
}

module.exports = handlePullRequestChange
