var express = require('express');
const bodyParser = require('body-parser');

const swaggerUi = require('swagger-ui-express');
const swaggerFile = require('./swagger_output.json')

// const YAML = require('yamljs')
// const swaggerDocument = YAML.load('./swagger.yml')

var app = express();
var mysql = require('mysql');
var queues = require('mysql-queues');
const DEBUG = true;

app.use(
	'/apidoc',
	swaggerUi.serve,
	swaggerUi.setup(swaggerFile)
);

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

//transaction的前置
queues(conn, DEBUG);

//使用bodyparser
//app.use(bodyParser.urlencoded({ extended: true}))
//app.use(require('connect').bodyParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

//這是首頁
app.get('/', function (req, res) {
	//設計阻擋 SQL Injection 的部分


	//get data test
	//	conn.query('SELECT * FROM `product`', function(err, result, fields){
	// 	if(err) throw err;
	// 	console.log(result[0].title);
	// });

	// console.log( 'select ended!' );


	res.send('Hello World');
})

//設計API
//Product List API
//Product Search API
//Product Details API
//Product Create API
//這個比較看不懂.... (但應該就是商品的數量，可能也要根據不同種類區分)
/*
	API : Get product list
	URL :
		https://xxx.xxx.xxx.xxx/api/product/list/:id
	METHOD : 
		GET
	PARAMETERS : 
		type : String
		num_page : int
	RETURN : 
		STATUS : 200 OK
		JSON :
		{
			product object
		}
*/
app.get('/api/v1/product/list/:category',function(req, res) { //這是其中一種取得parameter的方法
	//取得page_id
	var category = req.params.category;

	var page_id = req.query.id;

	//這裡打算找出所有產品，並用判斷式
	//page_id=1，做第一次查詢
	if (page_id==1){

	}
	//page_id!=1，可是查詢都要直接查，所以應該是用迴圈解決就好
	else{

	}

	//取得產品的各項資訊
	// conn.query('SELECT * FROM `user`', function(err, result, fields){
	// 	if(err) throw err;
	// 	console.log(result);
	// });

	//test
	res.send("取得Page: "+page_id);
})

//他要的是keywork看有沒有符合的title (Product Title)
app.get('/api/v1/product/search',function(req, res){//這則是另外一種，用body-parser的方式
	//取得查詢的keyword
	var keyword = req.query.keyword;

	//取得符合該關鍵字的產品資訊
	// conn.query('SELECT * FROM `user`', function(err, result, fields){
	// 	if(err) throw err;
	// 	console.log(result);
	// });

	//應該返回 JSON 格式的資料

	res.json({
		keyword:keyword
	});
})

//這個可能要加Detail_id (since it is one single product and above of them are a bunch of products)
app.get('/api/v1/product',function(req, res){

	//取得查詢的product id
	var product_id = req.query.id;

	//set up query
	var query = 'select P.title, PD.product_type '+ 
				'from '+
					'product as P '+
					'inner join '+
						'product_detail as PD '+
						'on PD.product_id=P.id '+
				'where P.id=?';

	//取得符合該關鍵字的產品資訊
	conn.query(query,[product_id], function(err, result, fields){
	 	if(err) throw err;
	 	console.log(result);
	});	

	//console.log(JSON.stringify(detail_id));
	//test
	res.send("detail_id: "+product_id);
})

//要加上所有產品Database需要的Column
app.post('/api/v1/product',function(req, res){
	
	//Get request Parameter
	var product_id = req.query.id;
	var product_name = req.query.name;
	var product_detail_id = req.query.detail_id;
	var product_type = req.query.type;
	var item_num = req.query.num;

	//Create query1, query2
	query = "insert into product values ('"+product_id+"','"+product_name+"','2022-04-15','2022-04-15')";
	query2 = "insert into product_detail values ('"+product_detail_id+"','"+product_id+"','"+product_type+"','"+item_num+"')";

	//use transaction insert into two tables
	var trans = conn.startTransaction();
	trans.query(query,function(err,info){
		if(err){
			throw err;
			trans.rollback();
		}
		else{
			trans.commit(function(err,info){
				console.log(info);
				trans.query(query2,function(err,info){
					if(err){
						//throw err;
						trans.rollback();
					}
					else{
						console.log(info);
						res.send("200OK");
					}
				})
			})
		}
	});
	trans.execute();
})

app.get('/admin',(req, res)=>{

})

var server = app.listen(3000, function () {
	var host = server.address().address
	var port = server.address().port

	console.log("Example app listening at http://%s:%s", host, port)
})