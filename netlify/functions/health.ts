export default async (): Promise<Response> => {
  const hasCloudSql = Boolean(
    process.env.SQL_HOST && process.env.SQL_DB_NAME && process.env.SQL_USER
  );
  return Response.json({ status: 'ok', cloudSqlEnabled: hasCloudSql });
};
