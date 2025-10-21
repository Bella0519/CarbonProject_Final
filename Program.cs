using CarbonProject.Models;
using Microsoft.EntityFrameworkCore; // ✅ 新增
using System;

var builder = WebApplication.CreateBuilder(args);

// 加入控制器與視圖服務
builder.Services.AddControllersWithViews();

// ✅ 啟用 Session
builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});

// ✅ 加入 MySQL 資料庫連線
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseMySql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        new MySqlServerVersion(new Version(8, 0, 36)) // ⚠️ 改成你安裝的 MySQL 版本
    ));

// ✅ 初始化 Members 連線設定
Members.Init(builder.Configuration);

var app = builder.Build();

// 環境設定
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();

// 啟用 Session
app.UseSession();

app.UseAuthorization();

// 預設路由
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();
