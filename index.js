import express from 'express'
import basicAuth from 'express-basic-auth'
import http from 'node:http'
import { createBareServer } from '@nebula-services/bare-server-node'
import path from 'node:path'
import cors from 'cors'
import config from './config.js'
import * as fs from 'fs';
const __dirname = process.cwd()
const server = http.createServer()
const app = express(server)
const bareServer = createBareServer('/v/')
const PORT = process.env.PORT || 8080

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'static')))
app.use(cors());

if (config.routes !== false) {
  const routes = [
    { path: '/tab', file: 'tab_idle.html' },
    { path: '/~', file: 'apps.html' },
    { path: '/-', file: 'games.html' },
    { path: '/!', file: 'settings.html' },
    { path: '/0', file: 'tabs.html' },
    { path: '/1', file: 'go.html' },
    { path: '/2', file: 'trusted.html'},
    { path: '/', file: 'index.html' },
    { path: '/migrate', file: 'links.html' }
  ]

  routes.forEach((route) => {
    app.get(route.path, (req, res) => {
      res.sendFile(path.join(__dirname, 'static', route.file))
    })
  })
}
if (config.local !== false) {
  app.get('/y/*', (req, res, next) => {
    const baseUrl = 'https://raw.githubusercontent.com/ypxa/y/main'
    fetchData(req, res, next, baseUrl)
  })

  app.get('/f/*', (req, res, next) => {
    const baseUrl = 'https://raw.githubusercontent.com/4x-a/x/fixy'
    fetchData(req, res, next, baseUrl)
  })
}

const fetchData = async (req, res, next, baseUrl) => {
  try {
    const reqTarget = `${baseUrl}/${req.params[0]}`
    const asset = await fetch(reqTarget)

    if (asset.ok) {
      const data = await asset.arrayBuffer()
      res.end(Buffer.from(data))
    } else {
      next()
    }
  } catch (error) {
    console.error('Error fetching:', error)
    next(error)
  }
}


const loadData = () => {
  try {
    const data = fs.readFileSync('users.json', 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return { count: 0, users: [] };
  }
};

const saveData = (data) => {
  fs.writeFileSync('users.json', JSON.stringify(data, null, 2), 'utf8');
};

let { count, users } = loadData();

app.get('/register-user', (req, res) => {
  const name = req.query.name;
  count += 1;
  const newUser = {
    name: name,
    id: count,
    timestamp: new Date().toISOString()
  };
  users.push(newUser);
  saveData({ count, users });
  console.log(name + ' VERIFIED WITH ID ' + count.toString())
  res.status(200).send(count.toString());
});
app.get('/del-user', (req, res) => {
  const id = req.query.id;
  users = users.filter(dict => dict.id !== parseInt(id));
  saveData({ count, users });
  console.log(id + ' REMOVED')
  res.status(200);
});
app.get('/user-data', (req, res) => {res.status(200).send([])})
server.on('request', (req, res) => {
  if (bareServer.shouldRoute(req)) {
    bareServer.routeRequest(req, res)
  } else {
    app(req, res)
  }
})

server.on('upgrade', (req, socket, head) => {
  if (bareServer.shouldRoute(req)) {
    bareServer.routeUpgrade(req, socket, head)
  } else {
    socket.end()
  }
})

server.on('listening', () => {
  console.log(`Running at http://localhost:${PORT}`)
})

server.listen(
  PORT,
  "0.0.0.0",
)
