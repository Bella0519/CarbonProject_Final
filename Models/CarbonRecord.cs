using System.ComponentModel.DataAnnotations;

namespace CarbonProject.Models
{
    public class CarbonRecord
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string Name { get; set; }

        public double Usage { get; set; }

        public string Unit { get; set; }

        public double Factor { get; set; }

        public double Emission { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}
