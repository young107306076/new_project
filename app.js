var express = require('express');
const bodyParser = require('body-parser');
var app = express();
var mysql = require('mysql');

//Database Setting up
var conn = mysql.createConnection({
	host: '127.0.0.1',
	user: 'root',
	password: 'young0709',
	database: 'stylist'
});

// 建立連線後不論是否成功都會呼叫
conn.connect(function(err){
	if(err) throw err;
 	console.log('connect success!');
});

//使用bodyparser
//app.use(bodyParser.urlencoded({ extended: true}))
//app.use(require('connect').bodyParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

//這是首頁
app.get('/', function (req, res) {

	//test
	conn.query('SELECT * FROM `product`', function(err, result, fields){
		if(err) throw err;
		console.log(result);
	});

	console.log( 'select ended!' );


	res.send('Hello World');
})

//設計API
//Product List API
//Product Search API
//Product Details API
//Product Create API
//這個比較看不懂.... (但應該就是商品的數量，可能也要根據不同種類區分)
app.get('/Product/List/:id',function(req, res) { //這是其中一種取得parameter的方法
	//取得page_id
	var page_id = req.params.id;

	//取得產品的各項資訊
	// conn.query('SELECT * FROM `user`', function(err, result, fields){
	// 	if(err) throw err;
	// 	console.log(result);
	// });

	//test
	console.log("取得Paging"+page_id);
})

//他要的是keywork看有沒有符合的title (Product Title)
app.get('/product/search',function(req, res){//這則是另外一種，用body-parser的方式
	//取得查詢的keyword
	//var keyword = JSON.parse(req.body);

	//取得符合該關鍵字的產品資訊
	// conn.query('SELECT * FROM `user`', function(err, result, fields){
	// 	if(err) throw err;
	// 	console.log(result);
	// });

	//test
	res.send(JSON.stringify(req.body));
})

//這個可能要加Detail_id
app.get('/product/details',function(req, res){
	//取得查詢的detail_id
	//var detail_id = JSON.parse(req.body);

	//console.log(JSON.stringify(detail_id));
	//test
	res.send(JSON.stringify(req.body));
})

//要加上所有產品Database需要的Column
app.post('/Product',function(req, res){
	
})

var server = app.listen(3000, function () {
	var host = server.address().address
	var port = server.address().port

	console.log("Example app listening at http://%s:%s", host, port)
})