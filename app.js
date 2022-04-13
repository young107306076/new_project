var express = require('express');
var app = express();
var mysql = require('mysql')

//Database Setting up
let conn = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'todoapp'
});

// 建立連線後不論是否成功都會呼叫
conn.connect(function(err){
    if(err) throw err;
    console.log('connect success!');
});

//這是首頁
app.get('/', function (req, res) {
   res.send('Hello World');
})

//設計API
//Product List API
//Product Search API
//Product Details API
//Product Create API
//這個比較看不懂.... (但應該就是商品的數量，可能也要根據不同種類區分)
app.get('/Product/List',function(req, res) {

    //取得產品的各項資訊
    conn.query('SELECT * FROM `user`', function(err, result, fields){
        if(err) throw err;
        console.log(result);
    });
})

//他要的是keywork看有沒有符合的title (Product Title)
app.get('/Product/Search',function(req, res){

})

//這個可能要加Detail_id
app.get('/Product/Details',function(req, res){
    
})

//要加上所有產品Database需要的Column
app.post('/Product',function(req, res){
    
})

var server = app.listen(3000, function () {
   var host = server.address().address
   var port = server.address().port
   
   console.log("Example app listening at http://%s:%s", host, port)
})