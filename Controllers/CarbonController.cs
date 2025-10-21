using Microsoft.AspNetCore.Mvc;
using CarbonProject.Models;

namespace CarbonProject.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CarbonController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public CarbonController(ApplicationDbContext context)
        {
            _context = context;
        }

        // ✅ 儲存前端送來的紀錄
        [HttpPost("SaveRecord")]
        public IActionResult SaveRecord([FromBody] CarbonRecord record)
        {
            if (record == null || string.IsNullOrEmpty(record.Name))
                return BadRequest("無效的資料");

            record.CreatedAt = DateTime.Now;
            _context.CarbonRecords.Add(record);
            _context.SaveChanges();

            return Ok(new { message = "✅ 碳足跡紀錄已儲存成功", record });
        }

        // ✅ 取得所有紀錄
        [HttpGet("GetRecords")]
        public IActionResult GetRecords()
        {
            var records = _context.CarbonRecords
                .OrderByDescending(r => r.CreatedAt)
                .ToList();

            return Ok(records);
        }

        // ✅ 清除所有紀錄
        [HttpDelete("ClearAll")]
        public IActionResult ClearAll()
        {
            _context.CarbonRecords.RemoveRange(_context.CarbonRecords);
            _context.SaveChanges();
            return Ok("🧹 已清空所有碳足跡紀錄");
        }
        [HttpDelete("Delete/{id}")]
public IActionResult Delete(int id)
{
    var record = _context.CarbonRecords.FirstOrDefault(r => r.Id == id);
    if (record == null)
        return NotFound($"找不到 ID={id} 的資料");
    _context.CarbonRecords.Remove(record);
    _context.SaveChanges();
    return Ok($"🗑 已刪除 ID={id} 的紀錄");
}

    }
}
