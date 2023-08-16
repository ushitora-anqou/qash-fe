import "./App.css";
import { useState, useEffect } from "react";
import {
  Link,
  Outlet,
  RouterProvider,
  createHashRouter,
  useLoaderData,
  useOutletContext,
} from "react-router-dom";
import "chart.js/auto";
import { Bar } from "react-chartjs-2";

function convertAccountToUrlId(account) {
  return btoa(unescape(encodeURIComponent(account)))
    .replaceAll("/", "_")
    .replaceAll("+", "-");
}

function convertUrlIdToAccount(url_id) {
  return decodeURIComponent(
    escape(atob(url_id.replaceAll("_", "/").replaceAll("-", "+"))),
  );
}

function Menu(props) {
  let { server_name } = useOutletContext();

  let account_menu = [];
  for (let account in props.data.account) {
    const rows = props.data.account[account];
    if (rows.length === 0) continue;
    account_menu.push(
      <div key={account}>
        <Link to={`/${server_name}/account/${convertAccountToUrlId(account)}`}>
          <div className="account">
            <div>{account.replaceAll(":", "　")}</div>
            <div className="amount">{rows[0].postings[0].balance_s} JPY</div>
          </div>
        </Link>
      </div>,
    );
  }
  return (
    <div className="sidebar">
      <h1>Qash</h1>
      <div key="gl">
        <Link to={`/${server_name}`}>総勘定元帳</Link>
      </div>
      <div key="charts">
        <Link to={`/${server_name}/charts`}>チャート</Link>
      </div>
      {account_menu}
    </div>
  );
}

function Page(props) {
  return (
    <>
      <Menu data={props.data} />
      <div className="content">
        <h1>{props.account ? props.account : "総勘定元帳"}</h1>
        {props.children}
      </div>
    </>
  );
}

function Chart(props) {
  const colors = [
    "#4E79A7",
    "#A0CBE8",
    "#F28E2B",
    "#FFBE7D",
    "#59A14F",
    "#8CD17D",
    "#B6992D",
    "#F1CE63",
    "#499894",
    "#86BCB6",
    "#E15759",
    "#FF9D9A",
    "#79706E",
    "#BAB0AC",
    "#D37295",
    "#FABFD2",
    "#B07AA1",
    "#D4A6C8",
    "#9D7660",
    "#D7B5A6",
  ];
  const rows = props.rows;
  const stacked = props.stacked;
  const options = {
    scales: {
      x: {
        stacked,
      },
      y: {
        beginAtZero: true,
        stacked,
      },
    },
  };
  const data = {
    labels: rows.labels,
    datasets: rows.data.map((ent, index) => ({
      label: ent.account,
      data: ent.data,
      borderWidth: 1,
      backgroundColor: colors[index % colors.length],
      stack: ent.stack,
    })),
  };
  return <Bar options={options} data={data} />;
}

function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function ClickableTableRow(props) {
  const [shown, setShown] = useState(false);

  const head_tr = (
    <tr className="row-normal" onClick={(e) => setShown((v) => !v)}>
      {props.head}
    </tr>
  );
  const hidden_trs = props.hidden.map((tds) => (
    <tr className={shown ? "row-hidden-shown" : "row-hidden"}>{tds}</tr>
  ));

  return (
    <>
      {head_tr}
      {hidden_trs}
    </>
  );
}

function renderTds(tx, postings) {
  let rendered = [];
  for (let pi = 0; pi < postings.length; pi++) {
    let tds = [];
    const p = postings[pi];
    if (pi === 0) {
      tds.push(<td className="col-date">{tx.date}</td>);
      tds.push(<td className="col-narration">{tx.narration}</td>);
    } else {
      tds.push(<td className="col-date"></td>);
      tds.push(<td className="col-narration"></td>);
    }
    if (p.amount < 0) {
      tds.push(<td className="col-account">{p.account}</td>);
      tds.push(<td className="col-debit"></td>);
      tds.push(<td className="col-credit">{p.abs_amount_s}</td>);
    } else {
      tds.push(<td className="col-account">{p.account}</td>);
      tds.push(<td className="col-debit">{p.abs_amount_s}</td>);
      tds.push(<td className="col-credit"></td>);
    }
    tds.push(<td className="col-balance">{pi !== 0 ? "" : p.balance_s}</td>);
    rendered.push(tds);
  }
  return rendered;
}

function renderTransactionsTable(trs) {
  return (
    <>
      <table className="transactions">
        <thead>
          <tr>
            <td className="col-date">日付</td>
            <td className="col-narration">説明</td>
            <td className="col-account">勘定科目</td>
            <td className="col-debit">借方</td>
            <td className="col-credit">貸方</td>
            <td className="col-balance">貸借残高</td>
          </tr>
        </thead>
        <tbody>{trs}</tbody>
      </table>
    </>
  );
}

function GLTable(props) {
  const rows = props.rows;

  if (!rows) return <></>;

  let trs = [];
  for (let ti = 0; ti < rows.length; ti++) {
    const tx = rows[ti];
    let postings = tx.postings;
    const rendered = renderTds(tx, postings);
    for (let tds of rendered) trs.push(<tr className="row-normal">{tds}</tr>);
  }

  return renderTransactionsTable(trs);
}

function AccountTable(props) {
  const rows = props.rows;
  const account = props.account;

  if (!rows) return <></>;

  let trs = [];
  for (let ti = 0; ti < rows.length; ti++) {
    const tx = rows[ti];

    const posting = deepCopy(
      tx.postings.filter((p) => p.account === account),
    )[0];
    if (tx.postings.length === 2) {
      const target = tx.postings.filter((p) => p.account !== account);
      posting.account = target[0].account;
    } else {
      posting.account = "-- スプリット取引 --";
    }
    const postings = [posting].concat(tx.postings);

    const rendered = renderTds(tx, postings);
    trs.push(
      <ClickableTableRow head={rendered[0]} hidden={rendered.slice(1)} />,
    );
  }

  return renderTransactionsTable(trs);
}

function accountLoader({ params }) {
  const account = convertUrlIdToAccount(params.account);
  return { account };
}

function AccountPage(props) {
  const { account } = useLoaderData();
  const rows = props.data?.account?.[account];
  if (!rows || rows.length === 0) return <></>;
  return (
    <Page data={props.data} account={account}>
      <AccountTable rows={rows} account={account} />
    </Page>
  );
}

function ChartPage(props) {
  const d = props.data;
  if (!d) return <></>;
  return (
    <Page data={d} account="チャート">
      <h2>資産</h2>
      <Chart rows={d.asset} stacked={true} />
      <h2>負債</h2>
      <Chart rows={d.liability} stacked={true} />
      <h2>収益</h2>
      <Chart rows={d.income} stacked={true} />
      <h2>費用</h2>
      <Chart rows={d.expense} stacked={true} />
      <h2>キャッシュフロー</h2>
      <Chart rows={d.cashflow} stacked={true} />
    </Page>
  );
}

function GLPage(props) {
  const d = props.data;
  if (!d) return <></>;
  return (
    <Page data={d}>
      <GLTable rows={d.gl} />
    </Page>
  );
}

function rootLoader({ params }) {
  const server_name = params.server_name;
  return { server_name };
}

function Root({ setData, errorMsg, setErrorMsg }) {
  const { server_name } = useLoaderData();

  useEffect(() => {
    const fetchData = async () => {
      const resp = await fetch(`http://${server_name}/data.json`);
      const json = await resp.json();
      if ("error" in json) {
        setErrorMsg(json.error);
      } else {
        setErrorMsg(null);
        setData(json);
      }
    };

    fetchData();

    const socket = new WebSocket(`ws://${server_name}/ws`);
    const onMessage = (event) => {
      if (event.data === "reload") {
        fetchData();
      }
    };
    socket.addEventListener("message", onMessage);
    return () => {
      socket.close();
      socket.removeEventListener("message", onMessage);
    };
  }, [setData, setErrorMsg, server_name]);

  return (
    <div className="App">
      {errorMsg && <h1>{errorMsg}</h1>}
      <Outlet context={{ server_name }} />
    </div>
  );
}

function App() {
  const [errorMsg, setErrorMsg] = useState(null);
  const [data, setData] = useState(null);

  const router = createHashRouter([
    {
      path: "/:server_name",
      loader: rootLoader,
      element: (
        <Root setData={setData} errorMsg={errorMsg} setErrorMsg={setErrorMsg} />
      ),
      children: [
        {
          path: "",
          element: <GLPage data={data} />,
        },
        {
          path: "charts",
          element: <ChartPage data={data} />,
        },
        {
          path: "account/:account",
          loader: accountLoader,
          element: <AccountPage data={data} />,
        },
      ],
    },
  ]);

  return (
    <>
      <RouterProvider router={router} />
    </>
  );
}

export default App;
