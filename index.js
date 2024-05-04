require('dotenv').config();

const express = require('express');
const cors = require('cors');
const app = express();
const dns = require('dns');
const bodyParser = require('body-parser');

const mongoose = require('mongoose');
const res = require('express/lib/response');
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

app.get('/api/shorturl/:id', async function(req, res, next) {
  let urlModel = new ShortUrlModel({newUrl: req.params.id});

    buildQuery(urlModel).then(query => {
      find(query)
        .then(resultSet => res.redirect(resultSet[0].name))
        .catch(err => res.json({ error: "No short URL found for the given input" }));
    });
});

const validateUrl = (url) => new Promise((resolve, reject) => {
  try{
    wellFormedUrl = new URL(url);
    dnsLookup(wellFormedUrl).then((result) => resolve(wellFormedUrl)).catch(err =>{ if(err){reject("Invalid Url")}});
  }catch(err){
    reject("Invalid Url");
  }
});

// Your first API endpoint
app.post('/api/shorturl', async function(req, res, next) {
  let valid = false;
  validateUrl(req.body.url)
  .then((url) => {
    const urlModel = new ShortUrlModel({name: url})
    buildQuery(urlModel).then((query) => {
      find(query)
      .then((resultSet) => {
        if(resultSet.length !== 0){
          resultSet = resultSet[0];
          res.json({ original_url: resultSet.name, short_url: resultSet.newUrl });
        }else{
          save(urlModel).then((resultSet) => {
            res.json({ original_url: resultSet.name, short_url: resultSet.newUrl });
          }).catch();
        }
      }).catch();
    })
  })
  .catch(function(err) { 
    res.json({ error: err }); 
  });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});

const dnsLookup = (url) => new Promise((resolve, reject) => {
  let hostname = url.hostname;

  dns.lookup(hostname, (err, address, family) => {
    if(err){
      reject('Invalid Url');
      return;
    }
    resolve(address);
  }); 
});

/*
  Builds the query to be used when looking up
  posted values in the db. allows us to have optional
  search terms and flex the find() function.
*/
const buildQuery = (urlModel) => new Promise((resolve, reject) => {
  let query = {};
  if(urlModel.name){
    query.name = urlModel.name;
  }
  if(urlModel.newUrl){
    query.newUrl = urlModel.newUrl;
  }
  resolve(query);
});

/*
  A simple lookup to see if a result exists in our db based
  on the query passed
*/
const find = (query) => new Promise(async (resolve, reject) => {
  var poo = await ShortUrlModel.find(query).exec();
  resolve(poo);
});

/*
  Save a newly created url model in our db.
  note that we use estimated document count to generate
  our new url in the db. Because this program is not likely
  to receive a multitude of concurrent request, this should be
  sufficiently correct.
*/
const save = (urlModel) => new Promise(async (resolve, reject) => {
  urlModel.newUrl = await ShortUrlModel.estimatedDocumentCount() + 1;
  try{
    let resultSet = await urlModel.save();
    resolve(resultSet);
  }catch(err){
    reject(err);
  }
});

function run() {
  try {
    mongoose.connect(uri);
  }catch(err){
    res.send("Connection error");
  }
}
