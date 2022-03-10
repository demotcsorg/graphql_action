const core = require('@actions/core');
const github = require('@actions/github');
const fetch = require('node-fetch');

const GITHUB_TOKEN = core.getInput('GITHUB_TOKEN');
const USERNAME = core.getInput('USERNAME');
const OPERATION = core.getInput('OPERATION');

try{
console.log(`Github Token ${GITHUB_TOKEN}`);
console.log(`Username ${USERNAME}`);
console.log(`Operation ${OPERATION}`);

const query_issue = {
    query: `query{
          user(login: "${USERNAME}") {
      issues(last: 100, orderBy: {field:CREATED_AT, direction: DESC}){
        totalCount
        nodes{
            id
          closed
          title
          createdAt
          url
          number
          assignees(first:100){
            nodes{
              avatarUrl
              name
              url
            }
          }
          repository{
            name
            url
            owner{
              login
              avatarUrl
              url
            }
          }
        }
      }
    }
}`,
};
const query_pr = {
  query: `
	query {
	  user(login: "${USERNAME}"){
	    pullRequests(last: 100, orderBy: {field: CREATED_AT, direction: DESC}){
      totalCount
      nodes{
        id
        title
        url
        state
	      mergedBy {
	          avatarUrl
	          url
	          login
	      }
	      createdAt
	      number
        changedFiles
	      additions
	      deletions
        baseRepository {
	          name
	          url
	          owner {
	            avatarUrl
	            login
	            url
	          }
	        }
      }
    }
	}
}
	`,
};


const baseUrl = "https://api.github.com/graphql";

const headers = {
  "Content-Type": "application/json",
  Authorization: "bearer " + GITHUB_TOKEN
};
console.log('before call');


  if(OPERATION == "query_issues"){
fetch(baseUrl, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(query_issue),
  })
    .then((response) => response.text())
    .then((txt) => {
      const data = JSON.parse(txt);
      //console.log('Data Obj');
      //console.log(JSON.stringify(data["data"]["user"]["issues"]));
      var cropped = { data: [] };
      cropped["data"] = data["data"]["user"]["issues"]["nodes"];
  
      var open = 0;
      var closed = 0;
      for (var i = 0; i < cropped["data"].length; i++) {
        if (cropped["data"][i]["closed"] === false) open++;
        else closed++;
      }
  
      cropped["open"] = open;
      cropped["closed"] = closed;
      cropped["totalCount"] = cropped["data"].length;
  
      console.log("Fetching the Issues Data.\n");
      console.log(JSON.stringify(cropped))


      
    })
    .catch((error) => console.log(JSON.stringify(error)))


}
else if(OPERATION == "query_pr"){
  fetch(baseUrl, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(query_pr),
  })
    .then((response) => response.text())
    .then((txt) => {
      const data = JSON.parse(txt);
      var cropped = { data: [] };
      cropped["data"] = data["data"]["user"]["pullRequests"]["nodes"];
  
      var open = 0;
      var closed = 0;
      var merged = 0;
      for (var i = 0; i < cropped["data"].length; i++) {
        if (cropped["data"][i]["state"] === "OPEN") open++;
        else if (cropped["data"][i]["state"] === "MERGED") merged++;
        else closed++;
      }
  
      cropped["open"] = open;
      cropped["closed"] = closed;
      cropped["merged"] = merged;
      cropped["totalCount"] = cropped["data"].length;
  
      console.log("Fetching the Pull Request Data.\n");
      console.log(JSON.stringify(cropped))
    })
    .catch((error) => console.log(JSON.stringify(error)));
}
else{
  console.log('Not a valid Operation')
}
}
catch(error){
    core.setFailed(error.message);
}