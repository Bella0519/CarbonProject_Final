using Microsoft.AspNetCore.Mvc;
using System.Text.RegularExpressions;
using CarbonProject.Models;

namespace CarbonProject.Controllers
{
    public class Account : Controller
    {
        private readonly IConfiguration _config;

        public Account(IConfiguration config)
        {
            _config = config;
            Members.Init(_config);
        }

        public IActionResult Login() => View();
        public IActionResult Register() => View();
        public IActionResult Admin_Read() => View();
        public IActionResult TestLogin() => View();

        [HttpPost]
        public IActionResult Login(string UID, string password)
        {
            var uidRegex = new Regex(@"^[a-zA-Z0-9]{4,}$");
            var pwdRegex = new Regex(@"^[a-zA-Z0-9]{8,}$");

            if (!uidRegex.IsMatch(UID))
            {
                ViewBag.Error = "帳號格式錯誤";
                return View();
            }
            if (!pwdRegex.IsMatch(password))
            {
                ViewBag.Error = "密碼格式錯誤";
                return View();
            }

            var member = Members.GetMember(UID, password);
            if (member == null)
            {
                TempData["LoginAlert"] = "登入失敗，請檢查帳號或密碼。";
                return RedirectToAction("Login");
            }

            HttpContext.Session.SetString("isLogin", "true");
            HttpContext.Session.SetString("userName", UID);
            return RedirectToAction("Dashboard", "Home");
        }

        [HttpPost]
        public IActionResult Logout()
        {
            HttpContext.Session.Clear();
            return RedirectToAction("Index", "Home");
        }
    }
}
