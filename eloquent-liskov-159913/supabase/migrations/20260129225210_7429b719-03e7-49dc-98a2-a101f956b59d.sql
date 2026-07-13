-- Update the notify_driver_on_document_review function to use valid notification types
CREATE OR REPLACE FUNCTION notify_driver_on_document_review()
RETURNS TRIGGER AS $$
DECLARE
  v_title TEXT;
  v_description TEXT;
  v_icon TEXT;
  v_doc_name TEXT;
BEGIN
  -- Only trigger when status changes from pending
  IF OLD.status = 'pending' AND NEW.status != 'pending' THEN
    -- Format document type name
    v_doc_name := REPLACE(INITCAP(NEW.document_type), '_', ' ');
    
    IF NEW.status = 'approved' THEN
      v_title := v_doc_name || ' Approved! ✓';
      v_description := 'Your ' || LOWER(v_doc_name) || ' has been verified and approved.';
      v_icon := 'file-check';
    ELSE
      v_title := v_doc_name || ' Not Approved';
      v_description := COALESCE(NEW.notes, 'Please resubmit a valid ' || LOWER(v_doc_name) || '.');
      v_icon := 'file-x';
    END IF;
    
    -- Insert notification with valid type 'system'
    INSERT INTO driver_notifications (driver_id, title, description, type, icon, action_url)
    VALUES (NEW.driver_id, v_title, v_description, 'system', v_icon, '/profile');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also update notify_driver_on_profile_change_review to use valid types
CREATE OR REPLACE FUNCTION notify_driver_on_profile_change_review()
RETURNS TRIGGER AS $$
DECLARE
  v_title TEXT;
  v_description TEXT;
  v_icon TEXT;
BEGIN
  -- Only trigger when status changes from pending
  IF OLD.status = 'pending' AND NEW.status != 'pending' THEN
    
    -- Set notification content based on type and status
    IF NEW.change_type = 'avatar' THEN
      IF NEW.status = 'approved' THEN
        v_title := 'Profile Picture Approved! 🎉';
        v_description := 'Your new profile picture is now active and visible to customers.';
        v_icon := 'check-circle';
      ELSE
        v_title := 'Profile Picture Not Approved';
        v_description := COALESCE(NEW.review_notes, 'Please upload a new photo that meets our guidelines.');
        v_icon := 'x-circle';
      END IF;
    ELSIF NEW.change_type = 'document' THEN
      IF NEW.status = 'approved' THEN
        v_title := 'Document Approved! ✓';
        v_description := 'Your document has been verified and approved.';
        v_icon := 'file-check';
      ELSE
        v_title := 'Document Not Approved';
        v_description := COALESCE(NEW.review_notes, 'Please resubmit with a valid document.');
        v_icon := 'file-x';
      END IF;
    END IF;
    
    -- Insert notification with valid type 'system'
    INSERT INTO driver_notifications (driver_id, title, description, type, icon)
    VALUES (NEW.driver_id, v_title, v_description, 'system', v_icon);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;