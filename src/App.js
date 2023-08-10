import "./App.css";
import { useState, useEffect } from "react";
import {
  createHashRouter,
  RouterProvider,
  Link,
  useLoaderData,
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
  let account_menu = [];
  for (let account in props.data.account) {
    const rows = props.data.account[account];
    if (rows.length === 0) continue;
    account_menu.push(
      <div key={account}>
        <Link to={"/account/" + convertAccountToUrlId(account)}>
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
        <Link to="/">総勘定元帳</Link>
      </div>
      <div key="charts">
        <Link to="/charts">チャート</Link>
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

function Table(props) {
  const rows = props.rows;

  if (!rows) return <></>;

  let trs = [];
  for (let ti = 0; ti < rows.length; ti++) {
    const tx = rows[ti];
    for (let pi = 0; pi < tx.postings.length; pi++) {
      let tds = [];
      const p = tx.postings[pi];
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
      tds.push(<td className="col-balance">{p.balance_s}</td>);
      trs.push(<tr>{tds}</tr>);
    }
  }

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
      <Table rows={rows} />
    </Page>
  );
}

function ChartPage(props) {
  const d = props.data;
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

function Root(props) {
  const d = props.data;
  if (!d) return <></>;

  const router = createHashRouter([
    {
      path: "/",
      element: (
        <Page data={d}>
          <Table rows={d.gl} />
        </Page>
      ),
    },
    {
      path: "/charts",
      element: <ChartPage data={d} />,
    },
    {
      path: "/account/:account",
      loader: accountLoader,
      element: <AccountPage data={d} />,
    },
  ]);

  return (
    <>
      <RouterProvider router={router} />
    </>
  );
}

function App() {
  const [errorMsg, setErrorMsg] = useState(null);
  const [data, setData] = useState(null);

  const fetchData = async () => {
    const resp = await fetch("http://localhost:8080/data.json");
    const json = await resp.json();
    if ("error" in json) {
      setErrorMsg(json.error);
    } else {
      setErrorMsg(null);
      setData(json);
    }
  };

  useEffect(() => {
    fetchData();

    const socket = new WebSocket(`ws://localhost:8080/ws`);
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
  }, []);

  return (
    <div className="App">
      {errorMsg && <h1>{errorMsg}</h1>}
      <Root data={data} />
    </div>
  );
}

export default App;
