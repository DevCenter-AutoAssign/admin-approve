

async function handlePullRequestChange (context) {

  try{
    const owner = context.payload.repository.owner.login
    const orgName = context.payload.organization.login
    const repoName = context.payload.repository.name
    const checkRun = await createCheckRun(context, orgName, repoName)
    const reviewCount = await getReviewsWithState(context, 'approved', owner, repoName)
    
    var approval = false;
    if(reviewCount > 0){
      approval = await getApprovalState(context, 'approved', owner, orgName, repoName)
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

async function getReviewsWithState (context, state, owner, repoName) {
  
  const response = await context.octokit.pulls.listReviews({
    owner: owner,
    repo: repoName,
    pull_number: context.payload.pull_request.number
  })
  
  return response.data.map(review => review.state).filter(word => word.toLowerCase() === state).length
}
async function getApprovalState(context, state, owner, orgName, repoName){
  
  const team = await getTeam(context, orgName, repoName);
  const admin = await getAdmin(context, team, orgName)
  var flag = 0;
  const reviewState = new Object();
  const response = await context.octokit.pulls.listReviews({
    owner: owner,
    repo: repoName,
    pull_number: context.payload.pull_request.number
  })
  response.data.forEach(element => {
    reviewState[element.user.login] = element.state;
    
  });
  for(let key in reviewState){
    let value = reviewState[key]
    if( key === admin && value.toLowerCase() === state){
      flag = 1;
    }
  }
  
  if(flag === 1)
    return true
  else
    return false
}

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

async function getAdmin(context, team, orgName){
  var admin;
  
  const response = await context.octokit.teams.listMembersInOrg({
      org: orgName,
      team_slug: team,
      role: 'maintainer'
  });
  if(Object(response.data).length > 0){
    response.data.forEach(item => {
        admin = item.login;
    })
  
    return admin;
  }else{
    throw "No admin in the team!"
  }
}

module.exports = handlePullRequestChange
