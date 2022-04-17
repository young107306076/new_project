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

//Set up Template Engine
app.set('view engine', 'ejs');

//Database Setting up
var connection = mysql.createConnection({
 	host: '127.0.0.1',
 	user: 'root',
 	password: 'young0709',
 	database: 'stylist',
	charset: 'UTF8_GENERAL_CI'
});



// 建立連線後不論是否成功都會呼叫
connection.connect(function(err){
 	if(err) throw err;
  	console.log('connect success!');
});

//transaction的前置
queues(connection, DEBUG);

//使用bodyparser
//app.use(bodyParser.urlencoded({ extended: true}))
//app.use(require('connect').bodyParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

//這是首頁
app.get('/', function (req, res) {
	//設計阻擋 SQL Injection 的部分


	//get data test
	//	connection.query('SELECT * FROM `product`', function(err, result, fields){
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
	var query = "select * from product as P "+
					"inner join product_color as PC "+
					"on PC.product_id=P.id "+
					"inner join product_detail as PD "+
					"on PD.product_color_id=PC.id "
				"where P.product_type=?";
	
	//setup return object
	var return_object={};

	//取得產品的各項資訊
	connection.query(query,[category], function(err, result, fields){
	 	if(err) throw err;
		if(result.length<page_id*6){
			for(let i=0; i<result.length; i++){
				//console.log(result[i]);
				return_object[result[i].name]=result[i];
			}
		}
		else{
			for(let i=(page_id-1)*6; i<page_id*6+1; i++){
				return_object[result[i].name]=result[i];
			}
		}
		res.send(return_object);
	});
})

//他要的是keywork看有沒有符合的title (Product Title)
app.get('/api/v1/product/search',function(req, res){//這則是另外一種，用body-parser的方式
	//取得查詢的keyword
	var keyword = req.query.keyword;

	//query setting
	var query = "select * from product as P "+
					"inner join "+
						"product_color as PC "+
						"on PC.product_id = P.id "+
					"inner join "+
						"product_detail as PD "+
						"on PD.product_color_id=PC.id "+
				"where P.name LIKE '%"+keyword+"%'";

	//create return json
	var return_object={};

	//取得符合該關鍵字的產品資訊
	connection.query(query, function(err, result, fields){
	 	if(err) throw err;
	 	//取出result的每筆資料
		for(let i=0; i<result.length; i++){
			return_object[result[i].name]=result[i];
		}

		res.send(return_object);
	});

	//應該返回 JSON 格式的資料
	//res.send(return_object);
})

//這個可能要加Detail_id (since it is one single product and above of them are a bunch of products)
app.get('/api/v1/product',function(req, res){

	//取得查詢的product id
	var product_detail_id = req.query.detail_id;

	//set up query
	var query = 'select P.name, P.product_type '+ 
				'from product as P '+
					'inner join '+
						'product_color as PC '+
						'on PC.product_id=P.id '+
					'inner join '+
						'product_detail as PD '+
						'on PD.product_color_id=PC.id '+
				'where PD.id=?';

	//取得符合該關鍵字的產品資訊
	connection.query(query,[product_detail_id], function(err, result, fields){
	 	if(err) throw err;
		res.send(result[0]);
	});	

	//console.log(JSON.stringify(detail_id));
	//test
	//res.send("detail_id: "+product_detail_id);
})

//要加上所有產品Database需要的Column
app.post('/api/v1/product',function(req, res){
	
	//Get request Parameter
	var product_id = req.query.id;
	var product_name = req.query.name;
	var product_detail_id = req.query.detail_id;
	var product_type = req.query.type;
	var product_color = req.query.color;
	var product_color_id = req.query.color_id;
	var product_size = req.query.size;

	//Create query1, query2, query3
	query = "insert into product values ('"+product_id+"','"+product_name+"','"+product_type+"','2022-04-15')";
	query2 = "insert into product_color values ('"+product_color_id+"','"+product_id+"','"+product_color+"')";
	query3 = "insert into product_detail values ('"+product_detail_id+"','"+product_color_id+"','"+product_size+"')";

	//use transaction insert into three tables
	connection.beginTransaction(function(err) {
		if (err) { throw err; }
		connection.query(query, function (error, results, fields) {
			if (error) {
				return connection.rollback(function() {
				throw error;
				});
			}
	  
			connection.query(query2, function (error, results, fields) {
				if (error) {
					return connection.rollback(function() {
						throw error;
					});
				}
				
				connection.query(query3, function (error, results, fields) {
					if (error) {
						return connection.rollback(function() {
							throw error;
						});
					}
					connection.commit(function(err) {
						if (err) {
							return connection.rollback(function() {
							throw err;
							});
						}
						console.log('success!');
						res.send("200_ok");
					});
				});
			});
		});
	});

	//trans.execute();
})

app.get('/admin',(req, res)=>{

	//render .ejs static File
	res.render('admin');
})

var server = app.listen(3000, function () {
	var host = server.address().address
	var port = server.address().port

	console.log("Example app listening at http://%s:%s", host, port)
})