const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt')
require('dotenv').config()

const encode_password = (password)=>{

	//use bcrypt hash it
	hashed_psw=bcrypt.hash(password, 8)

	//return
	return hashed_psw
}

const generate_jwt_token = (user_id)=>{

	// 產生一組 JWT
	var token = jwt.sign({ id: user_id }, process.env.SECRET, { expiresIn: '3 day' })
	
	// 回傳 JWT
	return token
}

module.exports={
	'generate_token':generate_jwt_token,
	'encode_psw': encode_password,
}