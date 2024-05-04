require('dotenv').config();

const express = require('express');
const cors = require('cors');
const app = express();
const dns = require('dns');
const bodyParser = require('body-parser');

const mongoose = require('mongoose');
const uri = "mongodb+srv://admin:wbhvEBCZaREYaD3L@cluster0.tzqsekk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const clientOptions = { serverApi: { version: '1', strict: true, deprecationErrors: true } };

// Define a schema
const Schema = mongoose.Schema;

const ShortUrlSchema = new Schema({
  name: String,
  newUrl: Number
});

const ShortUrlModel = mongoose.model("Url", ShortUrlSchema);

// Basic Configuration
const port = process.env.PORT || 3000;

// Entry point to our db.
run();

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.get('/api/shorturl/:id', async function(req, res) {
  let urlModel = new ShortUrlModel({newUrl: req.params.id});
  let query = buildQuery(urlModel)
  try{
    let resultSet = await find(query);
    res.redirect(resultSet[0].name);
  }catch(err){
    res.json({ error: "No short URL found for the given input" });
  }
});

// Your first API endpoint
app.post('/api/shorturl', async function(req, res) {
  let url = "";

  try{
    url = new URL(req.body.url);
  }catch(err){
    res.json({ error: "Invalid Url" });
    return;
  }

  try{
    const urlModel = new ShortUrlModel({name: url})
    let query = buildQuery(urlModel);
    let resultSet = await find(query);

    await dnsLookup(url);
    if(resultSet === 0){
      resultSet = await save(urlModel);
    }else{
      resultSet = resultSet[0];
    }
    res.json({ original_url: resultSet.name, short_url: resultSet.newUrl });
  }catch(err){
    res.json({ error: err })
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});

async function dnsLookup(url){
  let hostname = url.hostname;
  if(hostname == undefined){
    throw(err);
  }
  dns.lookup(hostname, (err) => {
    if(err){
      throw(err);
    }
    if(hostname = ""){  
      throw(err);
    }
  });
}

/*
  Builds the query to be used when looking up
  posted values in the db. allows us to have optional
  search terms and flex the find() function.
*/
function buildQuery(urlModel){
  let query = {};
  if(urlModel.name){
    query.name = urlModel.name;
  }
  if(urlModel.newUrl){
    query.newUrl = urlModel.newUrl;
  }
  return query;
}

/*
  A simple lookup to see if a result exists in our db based
  on the query passed
*/
async function find(query){
  try{
    let resultSet = await ShortUrlModel.find(query).exec();
    return resultSet;
  }catch(err){
    throw("Find error");
  }
}

/*
  Save a newly created url model in our db.
  note that we use estimated document count to generate
  our new url in the db. Because this program is not likely
  to receive a multitude of concurrent request, this should be
  sufficiently correct.
*/
async function save(urlModel){
  try{
    urlModel.newUrl = await ShortUrlModel.estimatedDocumentCount() + 1;
    let resultSet = await urlModel.save();
    return resultSet;
  }catch(err){
    throw("Save error");
  }
}

function run() {
  try {
    mongoose.connect(uri);
  }catch(err){
    throw("Connection error");
  }
}
