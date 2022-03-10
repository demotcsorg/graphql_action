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

const query_org = {
  query: `query{
	  user(login: "${USERNAME}") {
	    repositoriesContributedTo(last: 100){
	      totalCount
	      nodes{
	        owner{
	          login
	          avatarUrl
	          __typename
	        }
	      }
	    }
	  }
	}`,
};

const query_pinned_projects = {
  query: `
	query { 
	  user(login: "${USERNAME}") { 
	    pinnedItems(first: 6, types: REPOSITORY) {
	      totalCount
	      nodes{
	        ... on Repository{
	          id
		          name
		          createdAt,
		          url,
		          description,
		          isFork,
		          languages(first:10){
		            nodes{
		              name
		            }
		          }
	        }
	      }
		  }
	  }
	}
	`,
};

const query_commit = {
  query: `
  query {
    user(login: "${USERNAME}") {
      repository(name: "git_com"){
        ref(qualifiedName: "main"){
          target{
            ... on Commit{
              history(first: 10){
                edges{
                  node{
                    author{
                      name
                    }
                    message
                  }
                }
              }
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


  if(OPERATION == "query_org"){
fetch(baseUrl, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(query_org),
  })
    .then((response) => response.text())
    .then((txt) => {
        const data = JSON.parse(txt);
        const orgs = data["data"]["user"]["repositoriesContributedTo"]["nodes"];
        var newOrgs = { data: [] };
        for (var i = 0; i < orgs.length; i++) {
          var obj = orgs[i]["owner"];
          if (obj["__typename"] === "Organization") {
            var flag = 0;
            for (var j = 0; j < newOrgs["data"].length; j++) {
              if (JSON.stringify(obj) === JSON.stringify(newOrgs["data"][j])) {
                flag = 1;
                break;
              }
            }
            if (flag === 0) {
              newOrgs["data"].push(obj);
            }
          }
        }

      console.log("Fetching the Contributed Organization Data.\n");
      console.log(JSON.stringify(newOrgs))


      
    })
    .catch((error) => console.log(JSON.stringify(error)))
}


else if(OPERATION == "query_pinned_projects"){

  const languages_icons = {
    Python: "logos-python",
    "Jupyter Notebook": "logos-jupyter",
    HTML: "logos-html-5",
    CSS: "logos-css-3",
    JavaScript: "logos-javascript",
    "C#": "logos-c-sharp",
    Java: "logos-java",
  };

  fetch(baseUrl, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(query_pinned_projects),
  })
    .then((response) => response.text())
    .then((txt) => {
      const data = JSON.parse(txt);
      // console.log(txt);
      const projects = data["data"]["user"]["pinnedItems"]["nodes"];
      var newProjects = { data: [] };
      for (var i = 0; i < projects.length; i++) {
        var obj = projects[i];
        var langobjs = obj["languages"]["nodes"];
        var newLangobjs = [];
        for (var j = 0; j < langobjs.length; j++) {
          if (langobjs[j]["name"] in languages_icons) {
            newLangobjs.push({
              name: langobjs[j]["name"],
              iconifyClass: languages_icons[langobjs[j]["name"]],
            });
          }
        }
        obj["languages"] = newLangobjs;
        newProjects["data"].push(obj);
      }

      console.log("Fetching the Pinned Projects Data.\n");
      console.log(JSON.stringify(newProjects))
    })
    .catch((error) => console.log(JSON.stringify(error)));
}
else if(OPERATION == "query_commit"){
  fetch(baseUrl, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(query_commit),
  })
    .then((response) => response.text())
    .then((txt) => {
      const data = JSON.parse(txt);
      var cropped = { data: [] };
      cropped["data"] = data["data"]["user"]["repository"]["nodes"];
      // const orgs = data["data"]["user"]["repository"]["nodes"];
      // var newOrgs = { data: [] };
  
      // for (var i = 0; i < orgs.length; i++) {
      //   var obj = orgs[i]["author"];
      //   newOrgs["data"].push(obj);
      //  }
  
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