const axios = require('axios')
const { google } = require('googleapis')
const key = require('./saleproject_service.json')

const mysql = require('mysql2/promise')
const { Pool } = require('pg')

const jwtClient = new google.auth.JWT(
	key.client_email,
	null,
	key.private_key,
	['https://www.googleapis.com/auth/indexing'],
	null
)

async function notifyIndexing(urls) {
	try {
		const tokens = await jwtClient.authorize()

		for (const url of urls) {
			const options = {
				url: 'https://indexing.googleapis.com/v3/urlNotifications:publish',
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${tokens.access_token}`
				},
				data: {
					url: url, // ここにインデックスしたいURLを設定してください
					type: 'URL_UPDATED'
				}
			}
			const response = await axios(options)
			console.log(response.data)
			console.log('index完了!!')
		}
	} catch (err) {
		console.error(err)
	}
}

async function sitemapsql(req, res) {
	let connection
	// let connectionvercelpg
	// let siteMapCategoryUrl = [
	// 	// ここにカテゴリーURLのリストを挿入
	// 	'https://www.otoku-deal.com/category/%E5%AE%B6%E9%9B%BB%EF%BC%86%E3%82%AB%E3%83%A1%E3%83%A9/page/1',
	// 	'https://www.otoku-deal.com/category/%E3%83%91%E3%82%BD%E3%82%B3%E3%83%B3%E3%83%BB%E5%91%A8%E8%BE%BA%E6%A9%9F%E5%99%A8/page/1',
	// 	'https://www.otoku-deal.com/category/%E3%83%9B%E3%83%BC%E3%83%A0%EF%BC%86%E3%82%AD%E3%83%83%E3%83%81%E3%83%B3/page/1',
	// 	'https://www.otoku-deal.com/category/%E3%82%B9%E3%83%9D%E3%83%BC%E3%83%84%EF%BC%86%E3%82%A2%E3%82%A6%E3%83%88%E3%83%89%E3%82%A2/page/1',
	// 	'https://www.otoku-deal.com/category/%E9%A3%9F%E5%93%81%E3%83%BB%E9%A3%B2%E6%96%99%E3%83%BB%E3%81%8A%E9%85%92/page/1',
	// 	'https://www.otoku-deal.com/category/%E3%82%B2%E3%83%BC%E3%83%A0/page/1',
	// 	'https://www.otoku-deal.com/category/%E3%83%89%E3%83%A9%E3%83%83%E3%82%B0%E3%82%B9%E3%83%88%E3%82%A2/page/1',
	// 	'https://www.otoku-deal.com/category/%E3%83%95%E3%82%A1%E3%83%83%E3%82%B7%E3%83%A7%E3%83%B3/page/1',
	// 	'https://www.otoku-deal.com/category/%E3%83%93%E3%83%A5%E3%83%BC%E3%83%86%E3%82%A3%E3%83%BC/page/1',
	// 	'https://www.otoku-deal.com/category/DIY%E3%83%BB%E5%B7%A5%E5%85%B7%E3%83%BB%E3%82%AC%E3%83%BC%E3%83%87%E3%83%B3/page/1',
	// 	'https://www.otoku-deal.com/category/%E3%81%8A%E3%82%82%E3%81%A1%E3%82%83/page/1',
	// 	'https://www.otoku-deal.com/category/%E3%83%9A%E3%83%83%E3%83%88%E7%94%A8%E5%93%81/page/1',
	// 	'https://www.otoku-deal.com/group/page/1'
	// ]

	try {
		connection = await mysql.createConnection(
			'mysql://5hi36p5sxtkfcsnw9jd8:pscale_pw_h9h5vbxdy3mcKDIpbc5behVknX4NsJj9gY4uebfEGDt@aws.connect.psdb.cloud/salesitemap?ssl={"rejectUnauthorized":true}'
		)

		const pool = new Pool({
			connectionString:
				'postgres://default:INBAYS8vsd1Z@ep-raspy-heart-36988019.ap-southeast-1.aws.neon.tech:5432/verceldb?sslmode=require',
			// SSL接続が必要な場合は、下記の設定を追加
			ssl: {
				rejectUnauthorized: true
			}
		})

		// クエリの実行と結果の取得
		const resultPg = await pool.query(
			"SELECT id FROM blog_posts WHERE DATE(updated_at AT TIME ZONE 'JST') = CURRENT_DATE - 1 OR DATE(updated_at AT TIME ZONE 'JST') = CURRENT_DATE - 2;"
		)
		console.log(resultPg.rows) // PostgreSQLからのクエリ結果を表示
		await pool.end() // プールの終了

		let pgurls = resultPg.rows.map((row) => 'https://www.otoku-deal.com/post/' + row.id)
		console.log(pgurls)
		console.log(typeof pgurls)

		// TODO 前日・前々日データを含めるようにした -> Lambda.zipにしてアップロード

		const [rows] = await connection.query('SELECT * FROM sitemapurl ORDER BY date DESC LIMIT 100')
		let urls = rows.map((row) => 'https://www.otoku-deal.com/items/' + row.date + '/' + row.asin)

		let allUrls = pgurls.concat(urls)
		console.log(allUrls)
		await notifyIndexing(allUrls)
	} catch (err) {
		console.error(err)
	} finally {
		if (connection) {
			await connection.end()
		}
	}
}

// sitemapsql()

// Lambda用
exports.handler = async (event) => {
	await sitemapsql()
	return { statusCode: 200, body: 'Success' }
}
