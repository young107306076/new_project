//need package setup
require('dotenv').config()
var express = require('express');
const bodyParser = require('body-parser');

//Swagger create API
const swaggerUi = require('swagger-ui-express');
const swaggerFile = require('./swagger_output.json')

//產出加密功能Module
const jwt_token = require('./models/encryption.js')

// 額外加入驗證 Middleware
const auth = require('./middleware/auth')

var app = express();

//MySQL&Transaction Setup
var mysql = require('mysql');
var queues = require('mysql-queues');
const DEBUG = true;

//import childprocess to execute command line request
const util = require('util')
const exec = util.promisify(require('child_process').exec);

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
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

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

app.post('/api/v1/product/test', function(req, res){
	console.log(req.body);
	//console.log(req.query.id);
})

//要加上所有產品Database需要的Column
app.post('/api/v1/product',function(req, res){
	
	//Get request Parameter
	var product_id = req.body.id;
	var product_name = req.body.name;
	var product_detail_id = req.body.detail_id;
	var product_type = req.body.type;
	var product_color = req.body.color;
	var product_color_id = req.body.color_id;
	var product_size = req.body.size;

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

						connection.end();

						console.log('success!');
						res.send("200_ok");
					});
				});
			});
		});
	});

	//trans.execute();
})

app.get('/admin',auth,(req, res)=>{

	//render .ejs static File
	res.render('admin');
})

//log in & sign up mechanism
//sign up
app.post('api/v1/users/signup',(req, res)=>{

	console.log("ok")

	//prevent it from sql injection
	const onlyLettersPattern = /^[A-Za-z]+$/;
	if(
		!req.body.email.match(onlyLettersPattern) ||
		!req.body.password.match(onlyLettersPattern) ||
		!req.body.name.match(onlyLettersPattern) ||
		!req.body.phone.match(onlyLettersPattern) ||
		!req.body.address.match(onlyLettersPattern)
	){
		return res.status(400).json({ err: "No special characters and no numbers, please!"})
	}
	else{
		// 從 req.body 獲取用戶註冊資訊
		var user_email = req.body.email;
		var user_password = req.body.password;
		var user_name = req.body.name;
		var user_gender = req.body.gender;
		var user_phone = req.body.phone;
		var user_address = req.body.address;
	}
	
	//Singly handling picture
	var user_id=req.body.id;
	var user_photo_url="test";

	//handling password
	var hashed_psw=jwt_token.encode_psw(user_password);

	try{

		//store in database (user table)
		query = "insert into user values ('"+user_id+"','"+user_email+"','"+hashed_psw+"','True','2022-04-20','2022-04-20)";
		query2 = "insert into user_detail ('user_id','name','gender','phone','address','photo_url') "+
				"values ('"+user_id+"','"+user_name+"','"+user_gender+"','"+user_phone+"','"+user_address+"','"+user_photo_url+"')";
		//query3 = "insert into user_login values ('"+product_color_id+"','"+product_id+"','"+product_color+"')";
		
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
					
					connection.commit(function(err) {
						if (err) {
							return connection.rollback(function() {
							throw err;
							});
						}

						//close DB
						connection.end();
						
						//if successfully store
						res.status(201).send({ 
							"status_code":'200',
							"user_id": user_id,
							"user_email":user_email,
						});
					});
				});
			});
		});

	}catch(err){

		res.status(400).send(err);
	}
})

//sign up check page
app.get('api/v1/users/signup/verify',(req,res)=>{

})

//unit test
app.get('api/v1/user/test',(req, res)=>{

	var jwt = jwt_token.generate_token("test");

	console.log(jwt);

	res.send({
		"jwt":jwt
	})
})

//log in
app.post('api/v1/users/login',(req, res)=>{

	//先進行登入判斷
	//prevent it from sql injection
	const onlyLettersPattern = /^[A-Za-z]+$/;
	if(
		!req.body.email.match(onlyLettersPattern) ||
		!req.body.password.match(onlyLettersPattern)
	){
		return res.status(400).json({ err: "No special characters and no numbers, please!"})
	}
	else{
		// 從 req.body 獲取用戶註冊資訊
		var user_email = req.body.email;
		var user_password = req.body.password;
	}

	console.log(user_password)

	//encode the password
	//var hashed_psw = jwt_token.encode_psw(user_password)

	//check user information
	const query="select * from user where email=?";
	connection.query(query,[user_email], function(err, result){

		if(err) throw err;

		if(Object.keys(result[0]).length === 0){
			throw new Error('Unable to login')
		}
		else{
			const isMatch = bcrypt.compare(user_password, result[0].password);
		}
	   	
		// 驗證失敗時，丟出錯誤訊息
		if (!isMatch) { throw new Error('Unable to login') }

		// 驗證成功時，回傳該用戶完整資料
		//先產出一個 jwt
		var jwt = jwt_token.generate_token(result[0].id);

		//儲存登入資料
		query = "insert into user_login ('user_id','token','login_time') values ('"+result[0].id+"','"+jwt+"','2022-04-20')";

		//use transaction insert into three tables
		connection.beginTransaction(function(err) {
			if (err) { throw err; }
			connection.query(query, function (error, results, fields) {
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

					connection.end();
					
					//if successfully store
					res.send({
						"status":'200',
						"user_id":user_id,
						"jwt_token":jwt
					});
				});
			});
		});
	});
})

//log out with one device
app.post('api/v1/users/logout',auth,(req, res)=>{
	
	try {
		// 篩選掉當前的 Token
		var query = "delete token from user_login where token=?";

		//刪除符合該token的用戶登陸資訊
		connection.query(query,[req.token], function(err, result, fields){
			if(err) throw err;
			
			res.status(200).send()
		});	
	} catch (err) {
		res.status(500).send()
	}
})

//log out with all devices (還不用做......)
app.post('/users/logoutAll',auth, (req, res) => {

})

//user profile
app.get('/users/profile',auth,(req, res)=>{

	//取得 user_id
	var user_id = req.user.id;

	//
	// res.render('user_profile',{
	// 	"user_id":req.user.id,
	// 	"name":req.user.name //以此類推......

	// 	//傳過去怎麼接?
	// 	//<script>var name = "<%= name %>";</script>
	// 	//console.log(name);
	// })
	res.render('user_profile');
})

//Order checkout API
app.post('/api/v1/order/checkout',async function(req,res){

	//deal with params received from front-end
	var prime=req.body.prime;
	var expense=req.body.expense;
	var products=req.body.products;
	var order_number=req.body.order_number;
	var installment=req.body.installment;
	
	//思考一下付款期限的資料從何而來?
	//var delay_capture_in_days
	//這個在思考一下要不要放入
	//var card_info=req.body.card_info;

	//將訂單資料存入資料庫
	try{

		//store in database (user table)
		query = "insert into user values ('"+user_id+"','"+user_email+"','"+hashed_psw+"','True','2022-04-20','2022-04-20)";
		query2 = "insert into user_detail ('user_id','name','gender','phone','address','photo_url') "+
				"values ('"+user_id+"','"+user_name+"','"+user_gender+"','"+user_phone+"','"+user_address+"','"+user_photo_url+"')";
		//query3 = "insert into user_login values ('"+product_color_id+"','"+product_id+"','"+product_color+"')";
		
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
					
					connection.commit(function(err) {
						if (err) {
							return connection.rollback(function() {
							throw err;
							});
						}

						//close DB
						connection.end();
						
						//if successfully store
						res.status(201).send({ 
							"status_code":'200',
							"user_id": user_id,
							"user_email":user_email,
						});
					});
				});
			});
		});
	}catch(err){

	}

	//send request with command line
	//透過 curl 指令走訪 url 指定網址
	let {stdout, stderr} = await exec(
		`curl ` + 
		`-X GET ${url} ` +
		`-L ` + 
		`-H "User-Agent: ${headers['User-Agent']}" ` + 
		`-H "Accept-Language: ${headers['Accept-Language']}" ` + 
		`-H "Accept: ${headers['Accept']}" ` + 
		`-H "Cookie: ${headers['Cookie']}" `);
	
	
	//若銀行端顯示付款成功，則將該筆訂單的付款欄位改為True
	//並新增一筆付款成功的訂單 (這有必要???)
	let outcome=stdout.status;
	if(outcome=="0"){
		res.send({
			"status":outcome,
			"auth_code":stdout.auth_code,
			"bank_result_code":stdout.bank_result_code,
			"bank_result_msg":stdout.bank_result_msg
		});
	}	
})

//payment_page
app.get('/admin/checkout',(req, res)=>{
	res.render('payment');
})

//payment_success_page
app.get('/admin/checkout/success',(req ,res)=>{

})


var server = app.listen(3000, function () {
	var host = server.address().address
	var port = server.address().port

	console.log("Example app listening at http://%s:%s", host, port)
})