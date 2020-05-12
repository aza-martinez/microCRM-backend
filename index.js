const { ApolloServer, gql } = require("apollo-server");
const typeDefs = require("./db/schema");
const resolvers = require("./db/resolvers");
const conectarDB = require("./config/db");
const jwt = require("jsonwebtoken");
require("dotenv").config({ path: "variables.env" });

conectarDB();

//SERVIDOR
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    //console.log(req.headers['authorization']);

    const token = req.headers["authorization"] || "";
    console.log(token);

    if (token) {
      try {
        const usuario = jwt.verify(
          token.replace("Bearer ", ""),
          process.env.SECRET_JWT
        );
        //console.log(usuario)
        return { usuario };
      } catch (error) {
        console.log("Hubo un error");
        console.log(error);
      }
    }
  },
});

//ARRANCAR SERVIDOR
server.listen().then(({ url }) => {
  console.log(`SERVIDOR LISTO EN LA URL: ${url}`);
});
