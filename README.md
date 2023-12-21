# Upwork Auto-Apply Bot

**This app is not affiliated with Upwork**

This bot receives a list of job application URLs and auto-apply to each one of them.

**Parameters**<br><br>
**username** - The username or email used to log in to Upwork.<br>
**password** - The password used to log in to Upwork.<br>
**url** - The application URL of the job. Multiple job URLs can be passed as an array. Looks like this: https://www.upwork.com/ab/proposals/job/{Job_ID}/apply/#/<br>
**coverLetter** - The message you want to send as a cover letter to the job.<br>
**defaultAnswer** - Upwork asks a variable number of questions after the cover letter. This will be how each question after the cover letter is answered. Should be something generic, such as "Let's get on a call."<br>
**securityQuestion** - The answer to your Upwork security question.<br>
**proxyConfig** - This actor should be ran with a proxy. Choose a static or residential proxy group, or add a custom proxy.<br>
**debugMode** - If set to true, will return more detailed information.<br>
**testMode** - If set to true, will go through all of the steps, but not submit the job application.<br>
**agency** - Optional parameter to indicate whether the application should come from an Agency account. Should be an exact name to the Upwork Agency if used.<br>
**freelancer** - The freelancer's name on Upwork.<br>
**autoRefill** - Upwork requires credits to apply to jobs. If set to true, then the bot will automatically buy more credits with the payment method saved on your Upwork account. If set to false, the actor will stop running when you run out of credits.<br>
**autoRefillAmount** - The number of credits to purchase at once if **autorefill** is set to true.<br>
**ignoreDuplicateProposals** - If set to false, an error will show up when you attempt to apply to a job you already submitted an application for. If set to true, the actor will show a success status when attempting to apply to a job it already applied to.<br>


## Input example

```json
{
	"username": "USERNAME",
	"password": "PASSWORD",
	"startUrls": [{
		"url": "JOB_URL",
		"method": "GET"
	}],
	"coverLetter": "COVER_LETTER",
	"defaultAnswer": "DEFAULT_ANSWER",
	"securityQuestion": "SECURITY_ANSWER",
	"proxyConfig": {
		"useApifyProxy": true,
		"apifyProxyGroups": [
			"qfCaFFuCodXxAS59E"
		]
	},
	"debugMode": true,
	"testMode": false,
	"agency": "AGNECY",
	"freelancer": "FREELANCER",
	"autoRefill": true,
	"autoRefillAmount": "100",
	"ignoreDuplicateProposals": false
}
```
# upwork-application
