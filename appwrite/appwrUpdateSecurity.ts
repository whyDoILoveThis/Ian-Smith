
import { tablesDB } from "./appwriteConfig";

const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const tableId = process.env.NEXT_PUBLIC_APPWRITE_SECURITY_TABLE_ID!;
const rowId = "SECURITY_FLAG_DOC"; // fixed single-row document

export async function appwrGetSecurityFlag(): Promise<boolean> {
	try {
		const row = await tablesDB.getRow(databaseId, tableId, rowId);
		if (!row) return false;
		// Appwrite may place fields at top-level or inside `data`
		const val = row.isSecurityMaxed ?? row.data?.isSecurityMaxed ?? false;
		return Boolean(val);
	} catch (error: any) {
		if (error?.code === 404) return false;
		console.error("❌ Error fetching security flag:", error);
		throw error;
	}
}

export async function appwrSetSecurityFlag(isSecurityMaxed: boolean) {
	try {
		// Try updating existing row
		const response = await tablesDB.updateRow({
			databaseId,
			tableId,
			rowId,
			data: { isSecurityMaxed },
		});
		return response;
	} catch (error: any) {
		if (error?.code === 404) {
			// Create the row if it doesn't exist
			const response = await tablesDB.createRow({
				databaseId,
				tableId,
				rowId,
				data: { isSecurityMaxed },
			});
			return response;
		}
		console.error("❌ Error setting security flag:", error);
		throw error;
	}
}
