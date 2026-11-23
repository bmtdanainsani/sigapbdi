interface VercelRequest {
  method?: string;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (payload: unknown) => void;
}

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const hasCloudSql = Boolean(
    process.env.SQL_HOST && process.env.SQL_DB_NAME && process.env.SQL_USER
  );
  return res.status(200).json({ status: 'ok', cloudSqlEnabled: hasCloudSql });
}
