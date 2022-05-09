require("dotenv").config()
const express = require("express")
const Nylas = require("nylas")

const app = express()
const router = express.Router()
const port = process.env.PORT || 3000

Nylas.config({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
})

// Used the quickstart app to bootstrap this and ran into the folowing issues:
//  Problem: App redirect url needs to be added to nylas dashboard for their app - solvable
//  Problem: Error Message: "Due to recent Google OAuth security changes, you will need to create a Google Project and OAuth Client ID to use Gmail accounts with the Nylas API." - solvable but adds a significant hurdle

// Instructions for Callback URI
// 1. create account with Nylas
// 2. In your quickstart app, go to "App Settings", then click on the authentication tab
//    - add the following as a callback URI: http://localhost:3000/oauth/callback

// Instructions for Google Project creation: https://developer.nylas.com/docs/the-basics/provider-guides/google/create-google-app/

app.use(express.json())

// Auth route for your frontend to hit
app.get("/connect", (req, res, next) => {
  const returnPath = req.query.returnPath ?? "/"
  const options = {
    redirectURI: `http://localhost:${port}/oauth/callback`,
    state: `${returnPath}`,
  }
  res.redirect(Nylas.urlForAuthentication(options))
})

// Callback triggered on successful authentication
app.get("/oauth/callback", (req, res, next) => {
  if (req.query.code) {
    Nylas.exchangeCodeForToken(req.query.code).then((tokenData) => {
      const redirectPath = req.query.state
      handleNewlyGeneratedToken(tokenData).then((tokenData) => {
        res.redirect(
          "localhost:" +
            port +
            redirectPath +
            `?e=${encodeURIComponent(tokenData.emailAddress)}&t=${
              tokenData.accessToken
            }&p=${tokenData.provider}`
        )
      })
    })
  } else if (req.query.error) {
    res.render("error", {
      message: req.query.reason,
      error: {
        status:
          "Authentication failed: Please try authenticating again or use a different email account.",
      },
    })
  } else {
    res.redirect(appUrl)
  }
})

async function handleNewlyGeneratedToken(tokenData) {
  try {
    //  This is where you would save the access token to a DB or send to frontend
    //  this line will fail in our example
    await db.createAccount({
      account_id: tokenData.accountId,
      email: tokenData.emailAddress,
      accessToken: tokenData.accessToken,
      provider: tokenData.provider,
    })
  } catch (err) {
    // Log error using your logging software
    console.log(
      "something went wrong when trying to add sucessful auth info to DB" +
        err.message
    )
  } finally {
    // Even on failure, we return a token for demonstration purposes
    return tokenData
  }
}

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html")
})

app.listen(port, () => {
  console.log("app listening on port: " + port)
})
