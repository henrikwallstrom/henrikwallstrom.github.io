---
layout:     post
title:      Contributed Ansible IIS modules
date:       2015-04-24 08:51:00
summary:    Contributed Ansible IIS modules
categories: ansible powershell iis windows
---

<img src="{{ site.url }}/images/ansible-iis.png" alt="Ansible + IIS" style="display:block;width: 600px;margin-left: auto;margin-right: auto"/>

We use [Ansible](http://www.ansible.com/) at [Waulter](http://www.waulter.com) to automate our infrastructure. We also host our servers on Azure and use IIS on Windows as our application/web server. Unfortunately, there was no support for IIS in Ansible out of the box.

So, during a my Christmas vacation I decided to fix that by writing modules to manage IIS `web sites`, `web applications`, `virtual directories`, `application pools` and `web bindings`. 

They are now part of Ansible and can be found in the [module index](http://docs.ansible.com/ansible/latest/list_of_windows_modules.html):

* [win_iis_website - Configures a IIS Web site](http://docs.ansible.com/ansible/latest/win_iis_website_module.html)
* [win_iis_webapplication - Configures IIS web applications](http://docs.ansible.com/ansible/latest/win_iis_webapplication_module.html)
* [win_iis_webapppool - configures an IIS Web Application Pool](http://docs.ansible.com/ansible/latest/win_iis_webapppool_module.html)
* [win_iis_webbinding - Configures a IIS Web site](http://docs.ansible.com/ansible/latest/win_iis_webbinding_module.html)
* [win_iis_virtualdirectory - Configures a virtual directory in IIS](http://docs.ansible.com/ansible/latest/win_iis_virtualdirectory_module.html)

They are more or less wrappers around the [Web Server (IIS) Administration Cmdlets in Windows PowerShell](https://technet.microsoft.com/en-us/library/ee790599.aspx). 
