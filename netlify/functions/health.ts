export const handler = async () => {
  const hasCloudSql = Boolean(
    process.env.SQL_HOST && process.env.SQL_DB_NAME && process.env.SQL_USER
  );
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'ok', cloudSqlEnabled: hasCloudSql }),
  };
};
