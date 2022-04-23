require('dotenv').config()
var mysql = require('mysql');

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

module.exports = async (req, res, next) => {

	try {

		// 從來自客戶端請求的 header 取得和擷取 JWT
		const token = req.header('Authorization').replace('Bearer ', '')
		// 驗證 Token
		const decoded = jwt.verify(token, process.env.SECRET)

		//set up query
		//var query = 'select * from user_login where user_id=? and token=?';

		//找尋符合此 token 的使用者資料
		// connection.query(query,[decoded._id,token], function(err, result, fields){
		// 	if(err) throw err;
			
		// 	// 將 token 存到 req.token 上供後續使用
		// 	req.token=token
		// 	// 將 user 存到 req.user 上供後續使用
		// 	req.user=result[0]

		// 	next()
		// });	
		console.log(token)
		next()
	} catch (err) {
		console.error(err)
		res.status(401).send({ error: 'Please authenticate.' })
	}

}