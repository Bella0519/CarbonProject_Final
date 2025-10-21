using Microsoft.EntityFrameworkCore;

namespace CarbonProject.Models
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<CarbonRecord> CarbonRecords { get; set; }
    }
}
