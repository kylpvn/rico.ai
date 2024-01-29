import express from 'express';
import bcrypt from 'bcrypt';

import cors from 'cors';
import knex from 'knex';

const db = knex({
  // Enter your own database information here based on what you created
  client: 'pg',
  connection: {
    host: '127.0.0.1',
    user: 'kylpvn',
    password: '',
    database: 'rico.ai'
  }
});

knex.select('*').from('users');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    const data = await db
      .select('email', 'hash')
      .from('login')
      .where('email', '=', email)
      .first();
    if (!data) {
      throw new Error('Wrong credentials');
    }
    const isValid = await bcrypt.compare(password, data.hash);
    if (isValid) {
      const user = await db
        .select('*')
        .from('users')
        .where('email', '=', email)
        .first();
      if (!user) {
        throw new Error('Unable to get user');
      }
      res.json(user);
    } else {
      throw new Error('Wrong credentials');
    }
  } catch (err) {
    res.status(400).json(err.message);
  }
});

app.post('/register', async (req, res) => {
  try {
    const { email, name, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const trx = await db.transaction();
    const [loginEmail] = await trx('login')
      .insert({
        hash,
        email
      })
      .returning('email');
    const [user] = await trx('users')
      .returning('*')
      .insert({
        email: loginEmail,
        name,
        joined: new Date()
      });
    await trx.commit();
    res.json(user);
  } catch (err) {
    res.status(400).json('Unable to register');
  }
});

app.get('/profile/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await db.select('*').from('users').where({ id }).first();
    if (user) {
      res.json(user);
    } else {
      throw new Error('Not found');
    }
  } catch (err) {
    res.status(400).json(err.message);
  }
});

app.put('/image', async (req, res) => {
  try {
    const { id } = req.body;
    const [updatedEntries] = await db('users')
      .where('id', '=', id)
      .increment('entries', 1)
      .returning('entries');
    if (updatedEntries) {
      res.json(updatedEntries);
    } else {
      throw new Error('Unable to get entries');
    }
  } catch (err) {
    res.status(400).json(err.message);
  }
});

app.listen(3000, () => {
  console.log('App is running on port 3000');
});
