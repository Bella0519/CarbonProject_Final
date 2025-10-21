using MySql.Data.MySqlClient;
using BCrypt.Net;

namespace CarbonProject.Models
{
    public class Members
    {
        private static string _connStr = "";

        public static void Init(IConfiguration config)
        {
            _connStr = config.GetConnectionString("DefaultConnection") ?? "";
        }

        public static Member? GetMember(string uid, string password)
        {
            using var conn = new MySqlConnection(_connStr);
            conn.Open();

            string sql = "SELECT UID, Password FROM members WHERE UID = @UID";
            using var cmd = new MySqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@UID", uid);

            using var reader = cmd.ExecuteReader();
            if (reader.Read())
            {
                string hash = reader["Password"].ToString() ?? "";
                if (BCrypt.Net.BCrypt.Verify(password, hash))
                {
                    return new Member { UID = uid };
                }
            }
            return null;
        }

        public static bool Register(string uid, string password)
        {
            using var conn = new MySqlConnection(_connStr);
            conn.Open();

            string hash = BCrypt.Net.BCrypt.HashPassword(password);
            string sql = "INSERT INTO members (UID, Password) VALUES (@UID, @Password)";

            using var cmd = new MySqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@UID", uid);
            cmd.Parameters.AddWithValue("@Password", hash);

            try
            {
                cmd.ExecuteNonQuery();
                return true;
            }
            catch
            {
                return false;
            }
        }
    }

    public class Member
    {
        public string UID { get; set; } = "";
    }
}
