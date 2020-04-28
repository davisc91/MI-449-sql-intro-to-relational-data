var { Pool } = require('pg')

var pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
})

var todos = require('./todos.js')

var express = require('express')
var app = express()
var bodyParser = require('body-parser')
app.use(bodyParser.json())
var port = process.env.PORT || 8080

app.get('/', function (request, response) {
  response.json({
    welcome: 'welcome to my todo API!'
  })
})

app.get('/todos', async function (request, response) {
  var client = await pool.connect()
  var result = await client.query('select * from todos')
  response.json(result.rows)
  client.release()
})

app.get('/todos/:id', async function (request, response) {
  var client = await pool.connect()
  var result = await client.query(
    'select * from todo where id = $1',
    [request.params.id]
  )
  if (result.rows.length === 1) {
    response.json(result.rows[0])
  } else {
    response.status(404).json({
      error: 'todo ' + request.params.id + ' not found'
    })
  }
  client.release()
})

app.post('/todos', async function (request, response) {
  var description = request.body.description.trim()
  var slug = description.toLowerCase().split(' ').join('-')
  var completed = request.body.completed.trim()

  var client = await pool.connect()
  var result = await client.query(
    'insert into todo (slug, description, completed) values ($1, $2, $3) returning *',
    [slug, description, completed]
  )
  var id = result.rows[0].id
  response.redirect('/todos/' + id)
  client.release()
})

app.delete('/todos/:id', async function (request, response) {
  var client = await pool.connect()
  var result = await client.query(
    'select * from todo where id = $1',
    [request.params.id]
  )
  if (result.rows.length > 0) {
    await client.query(
      'delete from todo where id = $1',
      [request.params.id]
    )
    response.redirect('/todos')
  } else {
    response.status(404).json({
      error: 'todo ' + request.params.id + ' not found'
    })
  }
  client.release()
})

app.put('/todos/:id', async function (request, response) {
  if (
    request.body.description === undefined ||
    request.body.completed === undefined
  ) {
    response.status(400).json({
      error: 'description and completed are required'
    })
    return
  }

  var id = request.params.id
  var description = request.body.description.trim()
  var slug = description.toLowerCase().split(' ').join('-')
  var completed = request.body.completed.trim()

  var client = await pool.connect()
  var result = await client.query(
    'update todo set slug = $2, description = $3, completed = $4 where id = $1 returning *',
    [id, slug, description, completed]
  )
  if (result.rows.length === 1) {
    response.json(result.rows[0])
  } else {
    response.status(404).json({
      error: 'todo ' + request.params.id + ' not found'
    })
  }
  client.release()
})

app.use(function (request, response, next) {
  response.status(404).json({
    error: 'this file does not exist: ' + request.url
  })
})

app.listen(port)
