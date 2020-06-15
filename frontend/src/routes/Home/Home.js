import React from 'react'
import Octicon, { MarkGithub } from '@primer/octicons-react'
import './Home.css'

const Home = () => (
    <div id="ultima-root">
    <div className="nav">
      <div className="grid">
        <div className="logo" onClick={() => { window.location.href = '/' }}>
          <div className="logo-img"></div>
          <span className="logo-text">ultima</span>
        </div>
        <a href="https://medium.com/words-from-ultima">Announcements</a>
        <a href="https://twitter.com/ultimaup"><span className="mobile-hide">Live </span>updates</a>
      </div>
    </div>
    <div className="section top">
      <div className="grid">
        <h1>Build faster.</h1>
        <p>We’re building the most powerful, intuitive developer experience in the world. Ultima gives you everything you need to build, grow and manage your product. 
          <br /><br /> <a target="blank" rel="noopener" href="https://medium.com/words-from-ultima/announcing-ultima-build-faster-ship-faster-20ff1dd035a8">Read our announcement here</a> </p>
        <a className="button" href="/community">
          <div className="slack-logo"></div>
          Join the Insiders community
        </a>
        <ul className="usps">
          <li>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 0C4.45947 0 0 4.49326 0 10C0 15.5068 4.49326 20.0001 10 20.0001C15.5068 20.0001 20.0001 15.5068 20.0001 10C20.0001 4.49326 15.5406 0 10 0ZM8.07435 14.9325L7.973 15L3.88515 10.8784L5.81083 8.98651L8.00678 11.2163L14.1892 5.0338L16.1149 6.95948L8.07435 14.9325Z" fill="#E01E5A"/>
            </svg>
            <span>Local first</span>
          </li>
          <li>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 0C4.45947 0 0 4.49326 0 10C0 15.5068 4.49326 20.0001 10 20.0001C15.5068 20.0001 20.0001 15.5068 20.0001 10C20.0001 4.49326 15.5406 0 10 0ZM8.07435 14.9325L7.973 15L3.88515 10.8784L5.81083 8.98651L8.00678 11.2163L14.1892 5.0338L16.1149 6.95948L8.07435 14.9325Z" fill="#2EB67D"/>
            </svg>
            <span>Open source</span>
          </li>
          <li>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 0C4.45947 0 0 4.49326 0 10C0 15.5068 4.49326 20.0001 10 20.0001C15.5068 20.0001 20.0001 15.5068 20.0001 10C20.0001 4.49326 15.5406 0 10 0ZM8.07435 14.9325L7.973 15L3.88515 10.8784L5.81083 8.98651L8.00678 11.2163L14.1892 5.0338L16.1149 6.95948L8.07435 14.9325Z" fill="#ECB22E"/>
            </svg>
            <span>Community driven</span>
          </li>
        </ul>
      </div>
    </div>
    <div className="section ready">
      <div className="grid">
        <h2>Ready to get early access?</h2>
        <a className="button" href="/community">
          <div className="slack-logo"></div>
          Join the Insiders community
        </a>
      </div>
    </div>
    <div className="section footer">
      <div className="grid">
        <div className="logo">
          <div className="logo-img"></div>
          <span className="logo-text">ultima</span>
        </div>
        <div className="link-list">
            <span>Developers</span>
            <a href="/docs">Documentation</a>
            <a href="https://status.onultima.com/">Service Status</a>
            <a id="login" href="/auth/github">
              <Octicon icon={MarkGithub} />
              &nbsp;&nbsp;Log in
            </a>
        </div>
        <div className="link-list">
            <span>About</span>
            <a href="https://twitter.com/ultimaup">Twitter</a>
            <a href="https://medium.com/words-from-ultima">Medium</a>
            <a href="mailto:josh@onultima.com">Contact</a>
        </div>
      </div>
    </div>
    <a className="chat-bubble animated bounceInUp" href="/community">Join Slack</a>
</div>
)

export default Home