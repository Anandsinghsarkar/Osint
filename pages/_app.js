import Head from "next/head";
import "../styles/globals.css";
import "../styles/pro.css";
import "../styles/theme.css";
export default function App({Component,pageProps}){
  return <>
    <Head>
      <meta name="theme-color" content="#2563eb"/>
      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin=""/>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"/>
    </Head>
    <Component {...pageProps}/>
  </>;
}
