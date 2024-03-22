const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const bcrypt = require('bcrypt')

const databasePath = path.join(__dirname, 'userData.db')

const app = express()

app.use(express.json())

let database = null

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () =>
      console.log('Server Running at http://localhost:3000/'),
    )
  } catch (error) {
    console.log(`DB Error: ${error.message}`)
    process.exit(1)
  }
}

initializeDbAndServer()

//User Register API
app.post('/register', async (request, response) => {
  let {username, name, password, gender, location} = request.body

  let hashedPassword = await bcrypt.hash(password, 10)

  let checkTheUsername = `
                    SELECT *
                    FROM user
                    WHERE username = '${username}';`
  try {
    let userData = await database.get(checkTheUsername)
    if (!userData) {
      if (password.length < 5) {
        response.status(400).send('Password is too short')
      } else {
        let postNewUserQuery = `
                    INSERT INTO
                    user (username,name,password,gender,location)
                    VALUES (
                        '${username}',
                        '${name}',
                        '${hashedPassword}',
                        '${gender}',
                        '${location}'
                    );`
        await database.run(postNewUserQuery)
        response.status(200).send('User created successfully')
      }
    } else {
      response.status(400).send('User already exists')
    }
  } catch (error) {
    console.log('Database Error: ', error.message)
    response.status(500).send('Internal Server Error')
  }
})

//User Login API
app.post('/login', async (request, response) => {
  const {username, password} = request.body
  try {
    const userQuery = `
      SELECT *
      FROM user
      WHERE username = ?`
    const dbUser = await database.get(userQuery, [username])
    if (!dbUser) {
      response.status(400).send('Invalid User')
    } else {
      const isPasswordMatched = await bcrypt.compare(password, dbUser.password)
      if (isPasswordMatched) {
        response.send('Login Success!')
      } else {
        response.status(400).send('Invalid Password')
      }
    }
  } catch (error) {
    console.log('Database Error: ', error.message)
    response.status(500).send('Internal Server Error')
  }
})

// USer Change-Password API

app.put('/change-password', async (request, response) => {
  const {username, oldPassword, newPassword} = request.body
  try {
    const userQuery = `
      SELECT *
      FROM user
      WHERE username = ?`
    const dbUser = await database.get(userQuery, [username])
    if (!dbUser) {
      response.status(400).send('User not registered')
    } else {
      const isValidPassword = await bcrypt.compare(oldPassword, dbUser.password)
      if (isValidPassword) {
        const lengthOfNewPassword = newPassword.length
        if (lengthOfNewPassword < 5) {
          response.status(400).send('New password is too short')
        } else {
          const encryptedPassword = await bcrypt.hash(newPassword, 10)
          const updatePasswordQuery = `
            UPDATE user
            SET password = ?
            WHERE username = ?`
          await database.run(updatePasswordQuery, [encryptedPassword, username])
          response.send('Password updated')
        }
      } else {
        response.status(400).send('Invalid current password')
      }
    }
  } catch (error) {
    console.log('Database Error: ', error.message)
    response.status(500).send('Internal Server Error')
  }
})

module.exports = app
