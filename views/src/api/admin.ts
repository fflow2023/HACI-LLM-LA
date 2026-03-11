import request from "./axios";

export interface User {
	id: number;
	username: string;
	name: string;
	role: "ADMIN" | "USER";
	created_at: string;
}

async function executeSQL(sql: string): Promise<{ data: any; error?: string }> {
	try {
		const url = "sql";

		const response = await request.post(
			url,
			{ sql },
			{
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${localStorage.getItem("access_token")}`,
				},
				timeout: 10000,
			},
		);

		return { data: response.data };
	} catch (error: any) {
		let errorMessage = "网络请求失败";

		if (error.response) {
			// 处理HTTP错误状态码
			switch (error.response.status) {
				case 401:
					errorMessage = "身份认证过期，请重新登录";
					break;
				case 403:
					errorMessage = "权限不足，需要管理员权限";
					break;
				case 404:
					errorMessage = "接口不存在，请检查路径配置";
					break;
				default:
					errorMessage = error.response.data?.message || error.message;
			}
		}

		return {
			data: null,
			error: errorMessage,
		};
	}
}

// async function executeSQL(sql: string): Promise<{ data: any; error?: string }> {
//     try {
//         const response = await fetch(import.meta.env.VITE_VIEWS_ADDRESS + '/api/sql', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json'
//             },
//             body: JSON.stringify({ sql })
//         })

//         if (!response.ok) {
//             return {
//                 data: null,
//                 error: `HTTP错误: ${response.status} ${response.statusText}`
//             }
//         }

//         const result = await response.json()
//         return { data: result.data || result }

//     } catch (error) {
//         return {
//             data: null,
//             error: error instanceof Error ? error.message : '网络请求失败'
//         }
//     }
// }

// 获取用户列表
export async function fetchUsers(): Promise<{ data: User[]; error?: string }> {
	const result = await executeSQL(
		"SELECT id, username, name, role, created_at FROM users",
	);
	return {
		data: result.data as User[],
		error: result.error,
	};
}
export async function fetchUserCount(): Promise<{
	data: number;
	error?: string;
}> {
	const result = await executeSQL("SELECT COUNT(*) as user_count FROM users");

	if (result.error) {
		return { data: 0, error: result.error };
	}

	const count =
		result.data?.[0]?.user_count || result.data?.[0]?.["COUNT(*)"] || 0;
	return { data: Number(count) };
}

export async function updateUser(
	userId: number,
	updateData: { username: string; name: string; role: string },
): Promise<{ data?: User; error?: string }> {
	// 参数校验
	if (!["ADMIN", "USER"].includes(updateData.role)) {
		return { error: "无效的用户角色" };
	}

	const sql = `
        UPDATE users
        SET 
            username = '${updateData.username.replace(/'/g, "''")}', 
            name = '${updateData.name.replace(/'/g, "''")}', 
            role = '${updateData.role}'
        WHERE id = ${userId};
        
        SELECT id, username, name, role, created_at 
        FROM users 
        WHERE id = ${userId};
    `;

	const result = await executeSQL(sql);
	if (result.data?.length > 0) {
		return { data: result.data[0] as User };
	}
	return { error: result.error || "用户更新失败" };
}

// 重置用户密码
export async function resetPassword(
	userId: number,
): Promise<{ error?: string }> {
	// 默认密码设为Ab123456
	const defaultPasswordHash =
		"$2a$10$8z7Yv0nOVdM5vD9aVlg06eeMDgqfr80xxgTkqzOI5SklAi.0oxrPa";

	const sql = `
        UPDATE users 
        SET password = '${defaultPasswordHash}' 
        WHERE id = ${userId}
    `;

	const result = await executeSQL(sql);
	if (result.error) {
		return { error: result.error };
	}
	return {};
}

export interface ChatRecord {
	id: number;
	username: string;
	name: string;
	question: string;
	answer: string;
	characterUsed: string;
	knowledgeBase: string;
	created_at: string;
}

function buildWhereClause(params: {
	name?: string;
	username?: string;
	characterUsed?: string;
	knowledgeBase?: string;
	startTime?: string;
	endTime?: string;
}): string {
	const conditions: string[] = [];

	if (params.name) {
		conditions.push(`name = '${params.name.replace(/'/g, "''")}'`);
	}
	if (params.username) {
		conditions.push(`username = '${params.username.replace(/'/g, "''")}'`);
	}
	if (params.characterUsed) {
		conditions.push(
			`characterUsed = '${params.characterUsed.replace(/'/g, "''")}'`,
		);
	}
	if (params.knowledgeBase) {
		conditions.push(
			`knowledgeBase = '${params.knowledgeBase.replace(/'/g, "''")}'`,
		);
	}
	if (params.startTime) {
		conditions.push(`created_at >= '${params.startTime}'`);
	}
	if (params.endTime) {
		conditions.push(`created_at <= '${params.endTime}'`);
	}

	return conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
}

export async function fetchChatRecords(params: {
	name?: string;
	username?: string;
	characterUsed?: string;
	knowledgeBase?: string;
	startTime?: string;
	endTime?: string;
	page?: number;
	pageSize?: number;
}): Promise<{ data: ChatRecord[]; error?: string }> {
	const whereClause = buildWhereClause(params);
	const pagination = params.pageSize
		? `LIMIT ${params.pageSize} OFFSET ${(params.page || 0) * (params.pageSize || 0)}`
		: "";

	const sql = `
      SELECT id, username, name, question, answer, characterUsed, knowledgeBase, created_at
      FROM chat_records
      ${whereClause}
      ORDER BY created_at DESC
      ${pagination};
  `;

	const result = await executeSQL(sql);

	// 安全处理结果数据
	let records: ChatRecord[] = [];

	if (result.data && Array.isArray(result.data)) {
		records = result.data.map((record: any) => {
			return {
				...record,
				knowledgeBase: record.knowledgeBase || "none",
			};
		});
	} else if (result.data && typeof result.data === "object") {
		// 处理单条记录的情况
		records = [
			{
				...result.data,
				knowledgeBase: result.data.knowledgeBase || "none",
			},
		];
	}

	return {
		data: records as ChatRecord[],
		error: result.error,
	};
}

export async function fetchChatRecordCount(params: {
	name?: string;
	username?: string;
	characterUsed?: string;
	knowledgeBase?: string;
	startTime?: string;
	endTime?: string;
}): Promise<{ data: number; error?: string }> {
	const whereClause = buildWhereClause(params);

	const sql = `
      SELECT COUNT(*) as total 
      FROM chat_records
      ${whereClause};
  `;

	const result = await executeSQL(sql);
	if (result.error) {
		return { data: 0, error: result.error };
	}
	return {
		data: Number(result.data?.[0]?.total || 0),
	};
}

// 修改角色统计接口，添加英语和日语统计
export interface CharacterStats {
	strict: number;
	encouraging: number;
	topStudent: number;
	strugglingStudent: number;
	english: number; // 新增英语统计
	japanese: number; // 新增日语统计
	total: number;
}

export async function getallCharacterStats(): Promise<{
	data: CharacterStats;
	error?: string;
}> {
	const sql = `
    SELECT 
      COUNT(CASE WHEN characterUsed = 'strict' THEN 1 END) as strict,
      COUNT(CASE WHEN characterUsed = 'encouraging' THEN 1 END) as encouraging,
      COUNT(CASE WHEN characterUsed = 'topStudent' THEN 1 END) as topStudent,
      COUNT(CASE WHEN characterUsed = 'strugglingStudent' THEN 1 END) as strugglingStudent,
      COUNT(CASE WHEN knowledgeBase = 'english' THEN 1 END) as english,
      COUNT(CASE WHEN knowledgeBase = 'japanese' THEN 1 END) as japanese,
      COUNT(*) as total
    FROM chat_records
  `;

	const result = await executeSQL(sql);
	if (result.error) return { data: {} as CharacterStats, error: result.error };

	const data = result.data?.[0] || {};
	return {
		data: {
			strict: Number(data.strict) || 0,
			encouraging: Number(data.encouraging) || 0,
			topStudent: Number(data.topStudent) || 0,
			strugglingStudent: Number(data.strugglingStudent) || 0,
			english: Number(data.english) || 0,
			japanese: Number(data.japanese) || 0,
			total: Number(data.total) || 0,
		},
	};
}

export async function getCharacterStats(params: {
	name?: string;
	username?: string;
	characterUsed?: string;
	knowledgeBase?: string;
	startTime?: string;
	endTime?: string;
}): Promise<{ data: CharacterStats; error?: string }> {
	const whereClause = buildWhereClause(params);

	const sql = `
    SELECT 
      COUNT(CASE WHEN characterUsed = 'strict' THEN 1 END) as strict,
      COUNT(CASE WHEN characterUsed = 'encouraging' THEN 1 END) as encouraging,
      COUNT(CASE WHEN characterUsed = 'topStudent' THEN 1 END) as topStudent,
      COUNT(CASE WHEN characterUsed = 'strugglingStudent' THEN 1 END) as strugglingStudent,
      COUNT(CASE WHEN knowledgeBase = 'english' THEN 1 END) as english,
      COUNT(CASE WHEN knowledgeBase = 'japanese' THEN 1 END) as japanese,
      COUNT(*) as total
    FROM chat_records
    ${whereClause}
  `;

	const result = await executeSQL(sql);
	if (result.error) return { data: {} as CharacterStats, error: result.error };

	const data = result.data?.[0] || {};
	return {
		data: {
			strict: Number(data.strict) || 0,
			encouraging: Number(data.encouraging) || 0,
			topStudent: Number(data.topStudent) || 0,
			strugglingStudent: Number(data.strugglingStudent) || 0,
			english: Number(data.english) || 0,
			japanese: Number(data.japanese) || 0,
			total: Number(data.total) || 0,
		},
	};
}
