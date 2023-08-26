import "./App.css";
import { useState, useEffect, useRef } from "react";
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

function putCommas(num) {
  return Intl.NumberFormat().format(num);
}

function LinkToAccountPage(props) {
  let { server_name } = useOutletContext();
  return (
    <Link
      to={`/${server_name}/account/${convertAccountToUrlId(props.account)}`}
    >
      {props.children}
    </Link>
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
        <LinkToAccountPage account={account}>
          <div className="account">
            <div>{account.replaceAll(":", "　")}</div>
            <div className="amount">
              {putCommas(rows[0].postings[0].balance)} JPY
            </div>
          </div>
        </LinkToAccountPage>
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
      <div key="bs">
        <Link to={`/${server_name}/bs`}>貸借対照表</Link>
      </div>
      <div key="pl">
        <Link to={`/${server_name}/pl`}>損益計算書</Link>
      </div>
      <div key="cf">
        <Link to={`/${server_name}/cf`}>キャッシュフロー計算書</Link>
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
    <tr
      className={props.index % 2 === 0 ? "row-normal-even" : "row-normal-odd"}
      onClick={(e) => setShown((v) => !v)}
    >
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
      tds.push(<td className="col-credit">{putCommas(Math.abs(p.amount))}</td>);
    } else {
      tds.push(<td className="col-account">{p.account}</td>);
      tds.push(<td className="col-debit">{putCommas(Math.abs(p.amount))}</td>);
      tds.push(<td className="col-credit"></td>);
    }
    tds.push(
      <td className="col-balance">{putCommas(pi !== 0 ? "" : p.balance)}</td>,
    );
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
    for (let i = 0; i < rendered.length; i++)
      trs.push(
        <tr
          className={
            trs.length % 2 === 0 ? "row-normal-even" : "row-normal-odd"
          }
        >
          {rendered[i]}
        </tr>,
      );
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
      <ClickableTableRow
        index={ti}
        head={rendered[0]}
        hidden={rendered.slice(1)}
      />,
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
  const [focus, setFocus] = useState(null);
  const focusRef = useRef(null);
  const d = props.data;
  if (!d) return <></>;

  let overlay = <></>;
  if (focus !== null) {
    let chart = <></>;
    switch (focus) {
      case 0:
        chart = <Chart rows={d.asset} stacked={true} />;
        break;
      case 1:
        chart = <Chart rows={d.liability} stacked={true} />;
        break;
      case 2:
        chart = <Chart rows={d.income} stacked={true} />;
        break;
      case 3:
        chart = <Chart rows={d.expense} stacked={true} />;
        break;
      case 4:
        chart = <Chart rows={d.cashflow} stacked={true} />;
        break;
      default:
        break;
    }

    overlay = (
      <div className="overlay">
        <div className="overlay-content">
          <button onClick={() => setFocus(null)}>close</button>
          {chart}
        </div>
      </div>
    );
  }

  const onClickFocus = (i) => () => {
    setFocus(i);
    focusRef.current.focus({ preventScroll: true });
  };

  return (
    <>
      <div
        ref={focusRef}
        tabIndex="-1"
        onKeyDown={(e) => {
          if (e.keyCode === 27) {
            setFocus(null);
          }
        }}
      >
        {overlay}
      </div>
      <Page data={d} account="チャート">
        <h2>資産</h2>
        <button onClick={onClickFocus(0)}>focus</button>
        <Chart rows={d.asset} stacked={true} />
        <h2>負債</h2>
        <button onClick={onClickFocus(1)}>focus</button>
        <Chart rows={d.liability} stacked={true} />
        <h2>収益</h2>
        <button onClick={onClickFocus(2)}>focus</button>
        <Chart rows={d.income} stacked={true} />
        <h2>費用</h2>
        <button onClick={onClickFocus(3)}>focus</button>
        <Chart rows={d.expense} stacked={true} />
        <h2>キャッシュフロー</h2>
        <button onClick={onClickFocus(4)}>focus</button>
        <Chart rows={d.cashflow} stacked={true} />
      </Page>
    </>
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

function ReportPage(props) {
  const reportKind = props.kind;
  const [labelIndex, setLabelIndex] = useState(0);
  const sessionStorageKey = `reportpage-${reportKind}-labelIndex`;

  // Restore labelIndex from sessionStorage
  useEffect(() => {
    const labelIndex = sessionStorage.getItem(sessionStorageKey);
    if (labelIndex !== null) setLabelIndex(parseInt(labelIndex));
  }, [sessionStorageKey]);

  const d = props.data;
  if (!d) return <></>;
  const labels = d.expense.labels;

  const get_sum = (rows) => {
    let sum = 0;
    for (let x of rows.data) sum += x.data[labelIndex];
    return sum;
  };
  const get_detail = (rows) => {
    const detail = [];
    for (let x of rows.data) {
      detail.push({
        account: x.account,
        amount: x.data[labelIndex],
      });
    }
    return detail;
  };

  const render_inner_table = (name, sum, detail) => (
    <table className="pl-detail">
      <thead>
        <tr>
          <td>{name}</td>
          <td className="amount">{putCommas(sum)}</td>
        </tr>
      </thead>
      <tbody>
        {detail.map((x) => (
          <tr>
            <td className="account">
              <LinkToAccountPage account={x.account}>
                {x.account}
              </LinkToAccountPage>
            </td>
            <td className="amount">{putCommas(x.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  let title = "";
  let descPostfix = "";
  let upperTds = [],
    lowerTds = [];
  switch (reportKind) {
    case "cf": {
      title = "キャッシュフロー計算書";
      descPostfix = "からの 1 ヶ月間：";

      const labels = d.cashflow100.labels;
      const cashflow_data_in = d.cashflow100.data.filter(
        (x) => x.stack === "in",
      );
      const cashflow_data_out = d.cashflow100.data.filter(
        (x) => x.stack === "out",
      );
      const cashflow_in = { labels, data: cashflow_data_in };
      const cashflow_out = {
        labels,
        data: cashflow_data_out,
      };

      const in_sum = get_sum(cashflow_in);
      const in_detail = get_detail(cashflow_in);
      const out_sum = get_sum(cashflow_out);
      const out_detail = get_detail(cashflow_out);
      const net = in_sum - out_sum;
      if (net >= 0) {
        upperTds.push(
          <td>{render_inner_table("支出", out_sum, out_detail)}</td>,
        );
        upperTds.push(
          <td rowspan={2}>{render_inner_table("収入", in_sum, in_detail)}</td>,
        );
        lowerTds.push(<td>{render_inner_table("利益", net, [])}</td>);
      } else {
        upperTds.push(
          <td rowspan={2}>
            {render_inner_table("支出", out_sum, out_detail)}
          </td>,
        );
        upperTds.push(<td>{render_inner_table("収入", in_sum, in_detail)}</td>);
        lowerTds.push(<td>{render_inner_table("損失", -net, [])}</td>);
      }
      break;
    }

    case "pl": {
      title = "損益計算書";
      descPostfix = "までの 1 ヶ月間：";

      const expense_sum = get_sum(d.expense100);
      const expense_detail = get_detail(d.expense100);
      const income_sum = get_sum(d.income100);
      const income_detail = get_detail(d.income100);
      const net = income_sum - expense_sum;
      if (net >= 0) {
        upperTds.push(
          <td>{render_inner_table("費用", expense_sum, expense_detail)}</td>,
        );
        upperTds.push(
          <td rowspan={2}>
            {render_inner_table("収益", income_sum, income_detail)}
          </td>,
        );
        lowerTds.push(<td>{render_inner_table("当期純利益", net, [])}</td>);
      } else {
        upperTds.push(
          <td rowspan={2}>
            {render_inner_table("費用", expense_sum, expense_detail)}
          </td>,
        );
        upperTds.push(
          <td>{render_inner_table("収益", income_sum, income_detail)}</td>,
        );
        lowerTds.push(<td>{render_inner_table("当期純損失", -net, [])}</td>);
      }
      break;
    }

    case "bs": {
      title = "貸借対照表";
      descPostfix = "時点：";

      const asset_sum = get_sum(d.asset100);
      const asset_detail = get_detail(d.asset100);
      const liability_sum = get_sum(d.liability100);
      const liability_detail = get_detail(d.liability100);
      const net = asset_sum - liability_sum;
      upperTds.push(
        <td rowspan={2}>
          {render_inner_table("資産", asset_sum, asset_detail)}
        </td>,
      );
      upperTds.push(
        <td>{render_inner_table("負債", liability_sum, liability_detail)}</td>,
      );
      lowerTds.push(<td>{render_inner_table("資本", net, [])}</td>);

      break;
    }

    default:
  }

  return (
    <Page account={title} data={d}>
      <div>
        <p>
          <select
            value={labelIndex}
            defaultValue={labelIndex}
            onChange={(e) => {
              const newValue = e.target.value;
              sessionStorage.setItem(sessionStorageKey, newValue);
              setLabelIndex(newValue);
            }}
          >
            {labels.map((label, index) => (
              <option value={index}>{label}</option>
            ))}
          </select>
          {descPostfix}
        </p>
      </div>
      <table className="pl">
        <tbody>
          <tr>{upperTds}</tr>
          <tr>{lowerTds}</tr>
        </tbody>
      </table>
    </Page>
  );
}

function PLPage(props) {
  return <ReportPage kind="pl" data={props.data} />;
}

function BSPage(props) {
  return <ReportPage kind="bs" data={props.data} />;
}

function CFPage(props) {
  return <ReportPage kind="cf" data={props.data} />;
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
          path: "bs",
          element: <BSPage data={data} />,
        },
        {
          path: "pl",
          element: <PLPage data={data} />,
        },
        {
          path: "cf",
          element: <CFPage data={data} />,
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
