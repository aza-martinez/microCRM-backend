const Usuario = require("./../models/Usuario");
const Producto = require("./../models/Producto");
const Cliente = require("./../models/Cliente");
const Pedido = require("./../models/Pedido");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config({ path: "variables.env" });

const crearToken = (usuario, secreta, expiresIn) => {
  console.log(usuario);
  const { id, email, nombre, apellido } = usuario;

  return jwt.sign({ id, email, nombre, apellido }, secreta, { expiresIn });
};

// RESOLVERS
const resolvers = {
  Query: {
    obtenerUsuario: async (_, { token }, ctx) => {
      return ctx.usuario;
    },
    obtenerProductos: async () => {
      try {
        const productos = Producto.find({});
        return productos;
      } catch (error) {
        console.log(error);
      }
    },
    obtenerProducto: async (_, { id }) => {
      // revisar si el producto existe
      const producto = await Producto.findById(id);

      if (!producto) throw new Error("Producto no encontrado");

      return producto;
    },
    obtenerClientes: async () => {
      try {
        const clientes = await Cliente.find({});
        return clientes;
      } catch (error) {
        console.log(error);
      }
    },
    obtenerClientesVendedor: async (_, {}, ctx) => {
      try {
        const clientes = await Cliente.find({
          vendedor: ctx.usuario.id.toString(),
        });
        return clientes;
      } catch (error) {
        console.log(error);
      }
    },
    obtenerCliente: async (_, { id }, ctx) => {
      // REVISAR SI EL CLIENTE EXISTE
      const cliente = await Cliente.findById(id);

      if (!cliente) throw new Error("Cliente no ecnontrado");
      //  QUIEN LO CREO, PUEDE VERLO

      if (cliente.vendedor.toString() !== ctx.usuario.id)
        throw new Error("No tienes las credenciales");

      return cliente;
    },
    obtenerPedidos: async () => {
      try {
        const pedidos = await Pedido.find({});

        return pedidos;
      } catch (error) {
        console.log(error);
      }
    },
    obtenerPedidosVendedor: async (_, {}, ctx) => {
      try {
        const pedidos = await Pedido.find({
          vendedor: ctx.usuario.id,
        }).populate("cliente");

        return pedidos;
      } catch (error) {
        console.log(error);
      }
    },
    obtenerPedido: async (_, { id }, ctx) => {
      const pedido = await Pedido.findById(id);

      if (!pedido) throw new Error("Pedido no encontrado");

      if (pedido.vendedor.toString() !== ctx.usuario.id)
        Error("No tienes las credenciales");

      return pedido;
    },
    obtenerPedidosEstado: async (_, { estado }, ctx) => {
      const pedidos = await Pedido.find({ vendedor: ctx.usuario.id, estado });

      return pedidos;
    },
    mejoresClientes: async () => {
      const clientes = await Pedido.aggregate([
        { $match: { estado: "COMPLETADO" } },
        {
          $group: {
            _id: "$cliente",
            total: { $sum: "$total" },
          },
        },
        {
          $lookup: {
            from: "clientes",
            localField: "_id",
            foreignField: "_id",
            as: "cliente",
          },
        },
        {
          $limit: 10,
        },
        {
          $sort: { total: -1 },
        },
      ]);

      return clientes;
    },
    mejoresVendedores: async () => {
      const vendedores = await Pedido.aggregate([
        { $match: { estado: "COMPLETADO" } },
        {
          $group: {
            _id: "$vendedor",
            total: { $sum: "$total" },
          },
        },
        {
          $lookup: {
            from: "usuarios",
            localField: "_id",
            foreignField: "_id",
            as: "vendedor",
          },
        },
        {
          $limit: 3,
        },
        {
          $sort: { total: -1 },
        },
      ]);

      return vendedores;
    },
    buscarProducto: async (_, { texto }) => {
      const productos = await Producto.find({
        $text: { $search: texto },
      }).limit(10);

      return productos;
    },
  },
  Mutation: {
    nuevoUsuario: async (_, { input }) => {
      const { email, password } = input;

      // revisar si el usuario ya está registrado
      const existeUsuario = await Usuario.findOne({ email });
      if (existeUsuario) {
        throw new Error("El usuario ya esta registrado");
      }

      // HASHEAR PASSWORD
      const salt = await bcryptjs.genSaltSync(10);
      input.password = await bcryptjs.hashSync(password, salt);

      try {
        // GUARDAR EN LA BD
        const usuario = new Usuario(input);
        usuario.save();
        return usuario;
      } catch (error) {
        console.log(error);
      }
    },
    autenticarUsuario: async (_, { input }) => {
      console.log(input);
      const { email, password } = input;

      // revisar si el usuario existe
      const existeUsuario = await Usuario.findOne({ email });

      if (!existeUsuario) {
        throw new Error("El usuario no existe");
      }

      // Revisar si el password es correcto
      const passwordCorrecto = await bcryptjs.compareSync(
        password,
        existeUsuario.password
      );

      if (!passwordCorrecto) throw new Error("El password es incorrecto");

      return {
        token: crearToken(existeUsuario, process.env.SECRET_JWT, "24h"),
      };
    },
    nuevoProducto: async (_, { input }) => {
      try {
        const producto = new Producto(input);

        // almacenar en la bd
        const resultado = await producto.save();
        return resultado;
      } catch (error) {
        console.log(error);
      }
    },
    actualizarProducto: async (_, { id, input }) => {
      // revisar si el producto existe
      let producto = await Producto.findById(id);

      if (!producto) throw new Error("Producto no encontrado");

      producto = await Producto.findOneAndUpdate({ _id: id }, input, {
        new: true,
      });

      return producto;
    },
    eliminarProducto: async (_, { id }) => {
      // revisar si el producto existe
      let producto = await Producto.findById(id);

      if (!producto) throw new Error("Producto no encontrado");

      await Producto.findOneAndDelete({ _id: id });

      return "Producto eliminado";
    },
    nuevoCliente: async (_, { input }, ctx) => {
      console.log(ctx);
      const { email } = input;
      // VERIFICAR SI EL CLIENTE YA ESTA REGISTRAD
      console.log(input);
      const cliente = await Cliente.findOne({ email });

      if (cliente)
        throw new Error("No se pudo registrar por que el cliente ya existe");

      const nuevoCliente = new Cliente(input);

      // TODO: ASIGNAR VENDEDOR A CLIENTE
      nuevoCliente.vendedor = ctx.usuario.id;

      // GUARDARLO EN LA BD
      try {
        const resultado = await nuevoCliente.save();
        return resultado;
      } catch (error) {
        console.log(error);
      }
    },
    actualizarCliente: async (_, { id, input }, ctx) => {
      // verificar si existe o no
      let cliente = await Cliente.findById(id);

      if (!cliente)
        throw new Error("El cliente que intenta actualizar no existe");

      // verificar si el vendedor authenticado pertenece a este cliente
      if (cliente.vendedor.toString() !== ctx.usuario.id)
        throw new Error("No tienes las credenciales");

      // actualizar cliente
      cliente = await Cliente.findByIdAndUpdate({ _id: id }, input, {
        new: true,
      });

      return cliente;
    },
    eliminarCliente: async (_, { id }, ctx) => {
      // verificar si existe o no
      let cliente = await Cliente.findById(id);

      if (!cliente)
        throw new Error("El cliente que intenta eliminar no existe");

      // verificar si el vendedor authenticado pertenece a este cliente
      if (cliente.vendedor.toString() !== ctx.usuario.id)
        throw new Error("No tienes las credenciales");

      // eliminar Cliente
      await Cliente.findByIdAndDelete({ _id: id });
      return "Cliente Eliminado";
    },
    nuevoPedido: async (_, { input }, ctx) => {
      const { cliente } = input;

      // verificar si el cliente existe o no
      let clienteExiste = await Cliente.findById(cliente);

      if (!clienteExiste)
        throw new Error("El cliente que intenta asignar no existe");
      // verificar si el cliente es del vendedor
      if (clienteExiste.vendedor.toString() !== ctx.usuario.id)
        throw new Error("No tienes las credenciales");

      // Revisar que el stock esté disponible
      for await (const articulo of input.pedido) {
        const { id } = articulo;

        const producto = await Producto.findById(id);

        if (articulo.cantidad > producto.existencia) {
          throw new Error(
            `El articulo: ${producto.nombre} excede la cantidad disponible`
          );
        } else {
          producto.existencia = producto.existencia - articulo.cantidad;
          await producto.save();
        }
      }

      // crear nuevo pedido
      const nuevoPedido = new Pedido(input);

      // asignar vendedor
      nuevoPedido.vendedor = ctx.usuario.id;

      // Guardarlo en la bd
      const resultado = await nuevoPedido.save();

      return resultado;
    },
    actualizarPedido: async (_, { id, input }, ctx) => {
      const { cliente } = input;
      // si el pedido existe
      const existePedido = await Pedido.findById(id);
      if (!existePedido) throw new Error("El pedido no existe");

      // verificar si el cliente existe
      const clienteExiste = await Cliente.findById(cliente);
      if (!clienteExiste) throw new Error("El cliente no existe");

      // verificar si el cliente y pedido pertenece al vendedor
      if (clienteExiste.vendedor.toString() !== ctx.usuario.id)
        throw new Error("No tienes las credenciales");

      // revisar el stock
      if (input.pedido) {
        for await (const articulo of input.pedido) {
          const { id } = articulo;

          const producto = await Producto.findById(id);

          if (articulo.cantidad > producto.existencia) {
            throw new Error(
              `El articulo: ${producto.nombre} excede la cantidad disponible`
            );
          } else {
            producto.existencia = producto.existencia - articulo.cantidad;
            await producto.save();
          }
        }
      }

      // guardar el pedido
      const nuevoPedido = await Pedido.findOneAndUpdate({ _id: id }, input, {
        new: true,
      });
      return nuevoPedido;
    },
    eliminarPedido: async (_, { id }, ctx) => {
      // verificar si el pedido existe
      const pedido = await Pedido.findById(id);

      if (!pedido) throw new Error("El pedido no existe");

      // verificar si el vendedor es quien lo borra
      if (pedido.vendedor.toString() !== ctx.usuario.id)
        throw new Error("No tienes las credenciales");

      // eliminar de la bd
      await Pedido.findOneAndDelete({ _id: id });

      return "Pedido eliminado correctamente";
    },
  },
};

module.exports = resolvers;
