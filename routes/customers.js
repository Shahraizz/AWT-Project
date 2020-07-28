const express = require('express');
const db = require("../connection");
const _ = require("lodash");
const Joi = require('joi');
const util = require('util');

const route = express.Router();

route.get('/',(req,res)=>{
    db.query("SELECT * FROM customer", (err,result) => {
        if (err){
            console.log("error in query" + error.stack);
            return res.status(404).send("Resource not found");
        }
        res.render('Customers/view',{customers:result});
    });
});

route.post('/',(req,res)=>{
    //Validating the request
    var {error , value} = validateCustomer(req.body);
    if (error) return res.status(400).send(error.details[0].message);
    req.body.credit_limit = 10000;
    db.query('INSERT INTO customer SET ?' ,req.body ,(err,result)=>{
        if(err){
            //console.log("Error while adding new customer", error.stack);
            console.log(err.sqlMessage);
            return res.status(400).send(String(err.errno));
        }
        console.log("Sucessfuly added new customer");
        value['cid'] = result.insertId;
        res.send(value);
    });
});

route.delete('/:id',(req,res)=>{
    db.query('DELETE from customer where cid = ?',req.params.id,(err,result)=>{
        if(err){
            console.log(err.sqlMessage);
            return res.status(400).send("Can't delete the customer");
        }
        console.log('deleted ' + result.affectedRows + ' rows');
        return res.status(200).send("Record deleted successfully");
    });
});

route.put('/',(req,res)=>{
    //Validating the request
    var data = _.pick(req.body,['name','contact']);
    var {error , value} = validateCustomer(data);
    if (error) return res.status(400).send(error.details[0].message);

    let sql = `UPDATE customer SET ? WHERE cid = ?`;
    db.query(sql,[data,req.body.cid],(error,result) => {
        if (error){
            console.log(error.sqlMessage);
            return res.status(400).send(String(error.errno));
        } 
        console.log("Sucessfuly updated customer");
        res.send(req.body);
    });
});

route.get('/:id/orders',async (req,res)=>{

    const query = util.promisify(db.query).bind(db);
    let sql1 = "SELECT * FROM orders where cust_id = ? order by date desc";
    let sql2 = "SELECT name FROM customer where cid = ?";
    var orders,cust_name,total;
    try{
        orders = await query(sql1,req.params.id);
        cust_name = await query(sql2,req.params.id);

        for (o of orders){
            var date = o.date.split(' ')[0].split('-');
            date = new Date(date[0], date[1] - 1, date[2]); 
            o.date = date.toDateString();
        }

        res.render('Customers/orders',{
            orders:orders,
            customer:{name:cust_name[0].name, id:req.params.id},
        });
    } catch(err){
        console.log(err.stack);
        return res.status(400).send("can't load orders");
    }
});

// Total balance of a customer
route.get('/:oid/totalbalance',(req,res)=>{
    var sql = 'select sum(orders.balance) as total_balance from orders where cust_id = ?';
    db.query(sql,req.params.oid,(err,result)=>{
        if(err) return res.status(400).send("Can't Fetch the data, Please try again later");
        res.send(String(result[0].total_balance));
    });
});


function validateCustomer(data){
    const schema = {
        name : Joi.string().max(30).required(),
        contact : Joi.string().max(30)
    }
    return Joi.validate(data,schema);
}

module.exports = route;