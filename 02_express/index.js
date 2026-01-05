import  'dotenv/config'

import express from 'express';

import logger from "./logger.js";

import morgan from "morgan";

const app = express();

const port = process.env.PORT || 4000;

const morganFormat = ":method :url :status :response-time ms";

app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => {
        const logObject = {
          method: message.split(" ")[0],
          url: message.split(" ")[1],
          status: message.split(" ")[2],
          responseTime: message.split(" ")[3],
        };
        logger.info(JSON.stringify(logObject));
      },
    },
  })
);


// app.get("/", (req, res) => {
//     res.send("Hello from Sudhanva!")
// });

// app.get("/about", (req, res) => {
//     res.send("Sudhanva Kalghatgi, Backend Developer")
// });

// app.get("/instagram", (req, res) => {
//     res.send("kalghatgisudhanva")
// });

app.use(express.json()); // This takes the data which comes in JSON format
app.use(express.urlencoded({ extended: true }));
let myData = [];
let nextId = 1;

//ADD A NEW TEA
app.post("/addinfo", (req, res) => {
   logger.info("A POST request is made to add new item");
   const {name, price} = req.body
   const newData = {id: nextId++, name, price}
   myData.push(newData)
   res.status(201).send(newData)
});

//GET ALL TEA
app.get("/teas", (req, res) => {
    res.status(200).send(myData)
})

//GET TEA WITH ID
app.get("/teas/:id", (req, res) => {
    const tea = myData.find(t => t.id === parseInt(req.params.id));
    if (!tea) {
        return res.status(404).send("Tea Not Found!!!")
    }

    res.status(200).send(tea)
})


//UPDATE TEA
app.put("/teas/:id", (req, res) => {
    
    const tea = myData.find(t => t.id === parseInt(req.params.id));
    if (!tea) {
        return res.status(404).send("Tea Not Found!!!")
    }
    const {name, price} = req.body
    tea.name = name;
    tea.price = price;
    res.send(200).send(tea)
})

//DELETE TEA

app.delete("/teas/:id", (req, res) => {
   const index = myData.findIndex(t => t.id === parseInt(req.params.id));
   if (index === -1) {
    return res.status(404).send("Tea Not Found!!!")
   }
   myData.splice (index, 1)
   return res.status(204).send("Deleted!!!")
})

app.listen(port, () => {
    console.log(`Server is running at port: ${port}...`);
});
    