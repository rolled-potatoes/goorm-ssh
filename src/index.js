const puppeteer = require("puppeteer");
const {ACCOUNT_LINK, EMAIL, PW, LINK_LIST } = require("./env.json");
const { exec } = require("child_process");

async function accountLogin({ page }) {
  await page.goto(ACCOUNT_LINK);
  await page.focus("#emailInput");
  await page.keyboard.type(EMAIL);

  await page.focus("input[type=password]");
  await page.keyboard.type(PW);
  const loginButton = await page.$$("button").then((buttons) => buttons[1]);
  loginButton.click();
  await page.waitForNavigation();
}

async function awaitDockerLoading({ page }) {
  const loading_wrap_selector = "#loading_wrap";
  while (true) {
    const isEnd = await page.$eval(
      loading_wrap_selector,
      (el) => el.style.display === "none"
    );
    if (isEnd) break;
  }

  return new Promise((res) => {
    setTimeout(() => res(), 3000);
  });
}

function parse({ page, index }) {
  return new Promise(async (res) => {
    await page.click("#main-menu-container", { delay: 1000 });

    const sshButton = await page
      .$$("#main-menu-container li")
      .then((lis) => lis[0]);
    sshButton.click();

    setTimeout(async () => {
      await page.waitForSelector(
        "#dlg_ssh > div > div > div.modal-body.goorm_legacy__modal-body > div.ssh-info-container > div > div.row.passwd_row > div.col-md-4.gen_row > button"
      );
      await page.click(
        "#dlg_ssh > div > div > div.modal-body.goorm_legacy__modal-body > div.ssh-info-container > div > div.row.passwd_row > div.col-md-4.gen_row > button",
        { delay: 2000 }
      );

      setTimeout(async () => {
        const sshHost = await page.$eval(
          ".portforward_ssh_cmd_input",
          (el) => el.value
        );
        const sshPassword = await page.$eval(
          ".portforward_root_passwd_input",
          (el) => el.value
        );

        exec(
          `node /Users/goorm/dev-ssh.js edu${index} ${sshHost} ${sshPassword}`,
          (err, strout, strerr) => {
            if (err) console.log("erro", err);
            console.log(strout);
            console.log(strerr);
            res(true);
          }
        );
      }, 2000);
    }, 2000);
  });
}

async function run({ browser, link, index }) {
  const page = await browser.newPage();
  await page.setViewport({
    width: 1440,
    height: 800,
  });
  await page.goto(link);
  page.on("dialog", async (dialog) => {
    await dialog.accept();
  });

  await awaitDockerLoading({ page });
  await page.reload(true);
  await awaitDockerLoading({ page });
  return parse({ page, index });
}

async function main() {
  const browser = await puppeteer.launch({});
  const page = await browser.newPage();
  await page.setViewport({
    width: 1440,
    height: 800,
  });

  await accountLogin({ page });

  const promise_array = LINK_LIST.map((link, index) => {
    return run({ browser, link, index: index + 1 });
  });
  await Promise.all(promise_array);
  await browser.close();
}

main();
