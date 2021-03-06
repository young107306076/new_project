//need package setup
require('dotenv').config()
var express = require('express');
const bodyParser = require('body-parser');

//Swagger create API
const swaggerUi = require('swagger-ui-express');
const swaggerFile = require('./swagger_output.json')

//產出加密功能Module
const jwt_token = require('./models/encryption.js')
const bcrypt = require('bcrypt')

// 額外加入驗證 Middleware
const auth = require('./middleware/auth')

//Create app
var app = express();

//MySQL&Transaction Setup
var mysql = require('mysql');
var queues = require('mysql-queues');
const DEBUG = true;

//import childprocess to execute command line request
const util = require('util')
const exec = util.promisify(require('child_process').exec);
var XMLHttpRequest = require('xhr2');

//import image upload module & aws config
//const profileUpload = require('./middleware/file/index');
const awsConfig = require('./models/aws_s3_setting');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

// 圖片上傳
const profileUpload = multer({
	limit: {
	  // 限制上傳檔案的大小為 1MB
	  fileSize: 1000000
	},
	fileFilter(req, file, cb) {
	  // 只接受三種圖片格式
	  if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
		cb(null, false);
	  }
	  cb(null, true);
	}
});

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
  	password: process.env.database_pd,
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

	res.send("hello world!")
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

app.post('/api/v1/product/test', profileUpload.single('avatar'),async function(req, res){

	var file_test=req.file.buffer;
	
	//先將圖片存入S3
	const params = {
		Bucket: 'appwork-bucket', // 相簿位子
		Key: uuidv4(), // 你希望儲存在 S3 上的檔案名稱
		Body: file_test, // 檔案
		//ACL: 'public-read', // 檔案權限
		ContentType: req.file.mimetype // 副檔名
	};
	
	awsConfig.s3.upload(params, function(err, data) {
		if (err) {
			console.log(err, err.stack);
		}else{
			console.log('Bucket Created Successfully', data.Location);
		}
	});
})

//要加上所有產品Database需要的Column
app.post('/api/v1/product', profileUpload.single('avatar'),async function(req, res){
	
	//Get request Parameter
	var product_id = req.body.id;
	var product_name = req.body.name;
	var product_detail_id = req.body.detail_id;
	var product_type = req.body.type;
	var product_color = req.body.color;
	var product_color_id = req.body.color_id;
	var product_size = req.body.size;

	//先將圖片存入S3
	const params = {
		Bucket: 'appwork-bucket', // 相簿位子
		Key: uuidv4(), // 你希望儲存在 S3 上的檔案名稱
		Body: req.file.buffer, // 檔案
		ACL: 'public-read', // 檔案權限
		ContentType: req.file.mimetype // 副檔名
	};
	
	awsConfig.s3.upload(params, function(err, data) {
		if (err) {
			console.log(err, err.stack);
		}else{
			console.log('Bucket Created Successfully', data.Location);

			//開始存入資料庫
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
		}
	});
})

app.get('/admin',auth,(req, res)=>{

	//render .ejs static File
	res.render('admin');
})

//log in & sign up mechanism
//sign up
app.post('/api/v1/users/signup',(req, res)=>{

	//prevent it from sql injection
	const onlyLettersPattern = /^[A-Za-z]+$/;
	//if(
		// !req.query.password.match(onlyLettersPattern) ||
		// !req.query.name.match(onlyLettersPattern) ||
		// !req.query.phone.match(onlyLettersPattern) ||
		// !req.query.address.match(onlyLettersPattern)
	//){
		//return res.status(400).json({ err: "No special characters and no numbers, please!"})
	//}
	//else{
		// 從 req.body 獲取用戶註冊資訊
	var user_email = req.query.email;
	var user_password = req.query.password;
	var user_name = req.query.name;
	var user_gender = req.query.gender;
	var user_phone = req.query.phone;
	var user_address = req.query.address;
	//}
	
	//Singly handling picture
	var user_id=req.query.id;

	//set up image storage
	//先將圖片存入S3
	const params = {
		Bucket: 'appwork-bucket', // 相簿位子
		Key: uuidv4(), // 你希望儲存在 S3 上的檔案名稱
		Body: req.file.buffer, // 檔案
		ACL: 'public-read', // 檔案權限
		ContentType: req.file.mimetype // 副檔名
	};

	s3.upload(params, function(err, data) {
		if (err) {
			console.log(err, err.stack);
		}else{
			console.log('Bucket Created Successfully', data.Location);

			//store use data
			var user_photo_url=data.Location;

			//handling password
			var hashed_psw=jwt_token.encode_psw(user_password);

			try{

				//store in database (user table)
				query = "insert into user values ('"+user_id+"','"+user_email+"','"+hashed_psw+"','True','2022-04-20','2022-04-20')";
				query2 = "insert into user_detail  "+
						"values ('detail_test_1','"+user_id+"','"+user_name+"','"+user_gender+"','"+user_phone+"','"+user_address+"','"+user_photo_url+"')";

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
		} 
	});
})

//sign up check page
app.get('/api/v1/users/signup/verify',async function(req,res){

})

//unit test
app.post('/api/v1/user/test',async function(req, res){

	var password="test";
	var hashed_psw=await jwt_token.encode_psw(password);
	console.log(hashed_psw);
	bcrypt.compare(password, hashed_psw, function(err, result) {
		// result == true
		console.log(result)
	});
})

//log in page
app.get('/user/login',(req, res)=>{

	res.render('login')
})

//log in
app.post('/api/v1/users/login',async function(req, res){

	//先進行登入判斷
	//prevent it from sql injection
	//const onlyLettersPattern = /^[A-Za-z]+$/;
	//if(
		//req.body.email.match(onlyLettersPattern) ||
		//req.body.password.match(onlyLettersPattern)
	//){
		//return res.status(400).json({ err: "No special characters and no numbers, please!"})
	//}
	//else{
		// 從 req.body 獲取用戶註冊資訊
	var user_email = req.query.email;
	var user_password = req.query.password;
	
	//}

	//encode the password
	//var hashed_psw = jwt_token.encode_psw(user_password)

	//check user information
	const query="select * from user where email=?";
	connection.query(query,[user_email], async function(err, result){

		if(err) throw err;

		if(Object.keys(result[0]).length === 0){
			throw new Error('Unable to find result')
		}
		else{
			

			//要解決密碼不一致的問題
			const isMatch = await bcrypt.compare(user_password, result[0].password);
			
			// 驗證失敗時，丟出錯誤訊息
			if (!isMatch) { throw new Error('Unable to login') }

			// 驗證成功時，回傳該用戶完整資料
			//先產出一個 jwt
			var id = result[0].id
			var jwt=jwt_token.generate_token(id);

			//儲存登入資料
			const query2 = "insert into `user_login` (`user_id`,`token`,`login_time`) values ('"+result[0].id+"','"+jwt+"','2022-04-20');";

			//use transaction insert into three tables
			connection.beginTransaction(function(err) {
				if (err) { throw err; }
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

						connection.end();
						
						//if successfully store
						res.send({
							"status":'200',
							"user_id":id,
							"jwt_token":jwt
						});
					});
				});
			});
		}
	});
})

//log out with one device
app.post('/api/v1/users/logout',auth,(req, res)=>{
	
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

	var order_id="test2"

	//deal with params received from front-end (一些訂單基本資料)
	var prime=req.body.prime;
	var expense=req.body.expense;
	var products=req.body.products;
	var order_number=req.body.order_number;
	var installment=req.body.installment;
	//訂單成立位置在哪
	var source="website"
	
	const merchant_id="AppWorksSchool_CTBC";
	//思考一下付款期限的資料從何而來?
	//var delay_capture_in_days
	//這個在思考一下要不要放入
	//var card_info=req.body.card_info;

	//將訂單資料存入資料庫
	try{

		//store in database (order table)
		query = "insert into `order` values ('"+order_id+"','"+expense+"','"+source+"','False','2022-04-20')";
		
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

					});
			});
		});
	}catch(err){
		throw err
	}

	//send request with command line
	//透過 curl 指令走訪 url 指定網址
	// let {stdout, stderr} = await exec(
	// 	`curl ` + 
	// 	`-X POST https://sandbox.tappaysdk.com/tpc/payment/pay-by-prime ` +
	// 	`-H 'content-type: application/json' `+
	// 	`-H 'x-api-key: ${process.env.partner_key}' `+
	// 	`-d '{"partnet_key":"${process.env.partner_key}","prime":${prime},"merchant_id":${merchant_id},"details":"TapPay Test","amount":100,"cardholder":{"phone_number":"0955555555","name":"Young","email":"young30310@gmail.com","zip_code":"12345","address":"台北市天龍區芝麻街1號1樓","national_id":"A123456789"}}' `
	// );
	var url = "https://sandbox.tappaysdk.com/tpc/payment/pay-by-prime";

	var xhr = new XMLHttpRequest();
	xhr.open("POST", url);

	xhr.setRequestHeader("content-type", "application/json");
	xhr.setRequestHeader("x-api-key", "partner_PHgswvYEk4QY6oy3n8X3CwiQCVQmv91ZcFoD5VrkGFXo8N7BFiLUxzeG");

	xhr.onreadystatechange = function () {
	if (xhr.readyState === 4) {
		//console.log(xhr.status);
		//console.log(xhr.responseText);
		//若銀行端顯示付款成功，則將該筆訂單的付款欄位改為True
		//並新增一筆付款成功的訂單 (這有必要???)
		let jsonResponse = JSON.parse(xhr.responseText);
		let outcome = jsonResponse.status
		if(outcome=="0"){

			//將資料庫訂單的付款狀態改為True
			//update payment status
			query = "update `order` set is_payment='True' where id=?";
			
			connection.query(query,[order_id], function(err, result, fields){
				if(err) throw err;

				//close DB
				connection.end();
				
				console.log("order has been updated")
			});

			//return payment status
			res.json({
				"status":outcome,
				"auth_code":jsonResponse.auth_code,
				"bank_result_code":jsonResponse.bank_result_code,
				"bank_result_msg":jsonResponse.bank_result_msg
			});
		}
		else{
			res.send({
				"status":outcome,
				"error_msg":xhr.responseText.msg
			})
		}
	}};

	var data = `{
		"partner_key": "partner_PHgswvYEk4QY6oy3n8X3CwiQCVQmv91ZcFoD5VrkGFXo8N7BFiLUxzeG",
		"prime": "${prime}",
		"amount": "1",
		"merchant_id": "${merchant_id}",
		"details": "Some item",
		"cardholder": {
			"phone_number": "+886923456789",
			"name": "王小明",
			"email": "LittleMing@Wang.com",
			"zip_code": "100",
			"address": "台北市天龍區芝麻街1號1樓",
			"national_id": "A123456789"
		}
	}`;

	xhr.send(data);	
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