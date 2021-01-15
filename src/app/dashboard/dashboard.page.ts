// dashboard.page.ts
import { Component, OnInit, ViewChild } from '@angular/core';
import { NavController } from '@ionic/angular';
import { AuthenticateService } from '../services/authentication.service';
import { FirebaseService } from '../services/firebase.service';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';
import * as crypto from 'crypto-js'; 
import { AngularFireStorage, AngularFireUploadTask } from '@angular/fire/storage';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore'
import { Observable } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';

interface messageData {
  Name: string;
  Message: string;
  CreateDate: Date;
  Image: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit {

  @ViewChild('content') content: any;
  messageList = [];
  messageData: messageData;
  messageForm: FormGroup;

  userEmail: string;
  passEnc : string;

  // Upload Task 
  task: AngularFireUploadTask;

  // Progress in percentage
  percentage: Observable<number>;

  // Snapshot of uploading file
  snapshot: Observable<any>;

  // Uploaded File URL
  UploadedFileURL: Observable<string>;


  //File details  
  fileName:string;
  fileSize:number;

  //Status check 
  isUploading:boolean;
  isUploaded:boolean;

  
  constructor(
    private navCtrl: NavController,
    private authService: AuthenticateService,
    private firebaseService: FirebaseService,
    private storage: AngularFireStorage, 
    private database: AngularFirestore
  ) { 
    this.messageData = {} as messageData;
    this.isUploading = false;
    this.isUploaded = false;
  }

  ngOnInit() {
    this.passEnc = '123123';
    this.authService.userDetails().subscribe(res => {
      console.log('res', res);
      if (res !== null) {
        this.messageData.Name = res.email;
      } else {
        this.navCtrl.navigateBack('');
      }
    }, err => {
      console.log('err', err);
    })

    this.firebaseService.read_messages().subscribe(data => {
      console.log("Al inicio", this.messageList);
      this.messageList = data.map(e => {
        if(e.payload.doc.data()['Image']){
          return {
            id: e.payload.doc.id,
            isEdit: false,
            Name: e.payload.doc.data()['Name'],
            Message:crypto.AES.decrypt(e.payload.doc.data()['Message'], this.passEnc).toString(crypto.enc.Utf8),
            Image: e.payload.doc.data()['Image'],
          };
        }
        return {
          id: e.payload.doc.id,
          isEdit: false,
          Name: e.payload.doc.data()['Name'],
          Message:crypto.AES.decrypt(e.payload.doc.data()['Message'], this.passEnc).toString(crypto.enc.Utf8)
        };
      })

    });

  }

  CreateRecord() {
    this.passEnc = '123123';
    
    this.messageData.CreateDate = new Date();
    
    this.messageData.Message = crypto.AES.encrypt(this.messageData.Message, this.passEnc).toString();
    console.log(this.messageData.Message + ' Encriptado');

    this.firebaseService.create_message(this.messageData)
      .then(resp => {
        this.messageData.Message = null;
      })
      .catch(error => {
        console.log(error);
      });
  }

  logout() {
    this.authService.logoutUser()
      .then(res => {
        console.log(res);
        this.navCtrl.navigateBack('');
      })
      .catch(error => {
        console.log(error);
      })
  }


  uploadFile(event: FileList) {
    

    // The File object
    const file = event.item(0)

    // Validation for Images Only
    if (file.type.split('/')[0] !== 'image') { 
     console.error('unsupported file type :( ')
     return;
    }

    this.isUploading = true;
    this.isUploaded = false;


    this.fileName = file.name;

    // The storage path
    const path = `${new Date().getTime()}_${file.name}`;

    // Totally optional metadata
    const customMetadata = { app: 'Freaky Image Upload Demo' };

    //File reference
    const fileRef = this.storage.ref(path);

    // The main task
    this.task = this.storage.upload(path, file, { customMetadata });

    // Get file progress percentage
    this.percentage = this.task.percentageChanges();
    this.snapshot = this.task.snapshotChanges().pipe(
      
      finalize(() => {
        // Get uploaded file storage path
        this.UploadedFileURL = fileRef.getDownloadURL();
        
        this.UploadedFileURL.subscribe(resp=>{
          this.messageData.Image = resp;
        },error=>{
          console.error(error);
        })
      })
    )
  }  

}
